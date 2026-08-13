import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { canEncrypt, encrypt } from '../lib/crypto.js';
import {
  AffiliateError,
  buildAffiliateLink,
  detectMarketplace,
  READY_MARKETPLACES,
  type Marketplace,
} from '../services/affiliate.js';

const MARKETPLACES = ['amazon', 'shopee', 'mercado_livre'] as const;

const accountSchema = z.object({
  marketplace: z.enum(MARKETPLACES),
  publicId: z.string().trim().max(120).nullish(),
  secret: z.string().trim().max(500).nullish(),
});

const linkSchema = z.object({
  url: z.string().trim().min(8),
  marketplace: z.enum(MARKETPLACES).optional(),
  title: z.string().trim().max(200).optional(),
});

export async function affiliateRoutes(app: FastifyInstance) {
  /** Contas conectadas. O segredo nunca volta — só se está preenchido. */
  app.get('/affiliate/accounts', { preHandler: [app.authenticate] }, async (request) => {
    const accounts = await prisma.affiliateAccount.findMany({
      where: { userId: request.user.sub },
    });

    return {
      ready: READY_MARKETPLACES,
      accounts: MARKETPLACES.map((marketplace) => {
        const account = accounts.find((a) => a.marketplace === marketplace);
        return {
          marketplace,
          publicId: account?.publicId ?? null,
          hasSecret: Boolean(account?.secret),
          connected: Boolean(account?.publicId || account?.secret),
        };
      }),
    };
  });

  app.put('/affiliate/accounts', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = accountSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Datos inválidos.' });

    const { marketplace, publicId, secret } = parsed.data;

    if (secret && !canEncrypt()) {
      return reply.status(503).send({
        message:
          'CREDENTIALS_KEY no está configurada en el servidor. Sin ella no guardo secretos en texto plano.',
      });
    }

    const data = {
      ...(publicId !== undefined ? { publicId: publicId?.trim() || null } : {}),
      ...(secret !== undefined ? { secret: secret ? encrypt(secret) : null } : {}),
    };

    const account = await prisma.affiliateAccount.upsert({
      where: { userId_marketplace: { userId: request.user.sub, marketplace } },
      update: data,
      create: { userId: request.user.sub, marketplace, ...data },
    });

    return {
      account: {
        marketplace: account.marketplace,
        publicId: account.publicId,
        hasSecret: Boolean(account.secret),
        connected: Boolean(account.publicId || account.secret),
      },
    };
  });

  app.post('/affiliate/links', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = linkSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Indica la URL del producto.' });

    const marketplace =
      parsed.data.marketplace ?? (detectMarketplace(parsed.data.url) as Marketplace | null);

    if (!marketplace) {
      return reply.status(422).send({
        message: 'No reconocí el marketplace de esta URL. Usa Amazon, Shopee o Mercado Libre.',
      });
    }

    const account = await prisma.affiliateAccount.findUnique({
      where: { userId_marketplace: { userId: request.user.sub, marketplace } },
    });

    try {
      const result = buildAffiliateLink(parsed.data.url, marketplace, account);

      const saved = await prisma.affiliateLink.create({
        data: {
          userId: request.user.sub,
          marketplace,
          originalUrl: parsed.data.url,
          affiliateUrl: result.affiliateUrl,
          title: parsed.data.title,
        },
      });

      return {
        link: {
          id: saved.id,
          marketplace: saved.marketplace,
          originalUrl: saved.originalUrl,
          affiliateUrl: saved.affiliateUrl,
          createdAt: saved.createdAt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof AffiliateError) {
        return reply
          .status(error.code === 'BAD_URL' ? 400 : 422)
          .send({ message: error.message, code: error.code });
      }
      return reply.status(500).send({ message: 'Falló la generación del enlace.' });
    }
  });

  app.get('/affiliate/links', { preHandler: [app.authenticate] }, async (request) => {
    const links = await prisma.affiliateLink.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      links: links.map((link) => ({
        id: link.id,
        marketplace: link.marketplace,
        originalUrl: link.originalUrl,
        affiliateUrl: link.affiliateUrl,
        title: link.title ?? undefined,
        createdAt: link.createdAt.toISOString(),
      })),
    };
  });

  app.delete('/affiliate/links/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await prisma.affiliateLink.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (deleted.count === 0) return reply.status(404).send({ message: 'Enlace no encontrado.' });

    return { ok: true };
  });
}
