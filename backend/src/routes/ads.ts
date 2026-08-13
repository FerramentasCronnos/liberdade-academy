import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const adSchema = z.object({
  title: z.string().trim().min(2).max(140),
  category: z.string().trim().max(40).default('geral'),
  image: z.string().trim().url().max(600),
  notes: z.string().trim().max(500).nullish(),
});

export const AD_CATEGORIES = [
  'geral',
  'beleza',
  'saude',
  'fitness',
  'moda',
  'casa',
  'tech',
] as const;

export async function adRoutes(app: FastifyInstance) {
  /** Todo membro logado vê o baú. */
  app.get('/ads', { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as { category?: string };

    const [ads, me] = await Promise.all([
      prisma.adCreative.findMany({
        where: {
          active: true,
          ...(query.category && query.category !== 'todos' ? { category: query.category } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findUnique({ where: { id: request.user.sub } }),
    ]);

    return {
      isAdmin: Boolean(me?.isAdmin),
      categories: AD_CATEGORIES,
      ads: ads.map((ad) => ({
        id: ad.id,
        title: ad.title,
        category: ad.category,
        image: ad.image,
        notes: ad.notes ?? undefined,
        downloads: ad.downloads,
        createdAt: ad.createdAt.toISOString(),
      })),
    };
  });

  /** Só a administração publica — o baú é curadoria, não upload livre. */
  app.post('/ads', { preHandler: [app.authenticate] }, async (request, reply) => {
    const me = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!me?.isAdmin) return reply.status(403).send({ message: 'Acceso restringido.' });

    const parsed = adSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Datos inválidos.' });

    const ad = await prisma.adCreative.create({
      data: { ...parsed.data, createdById: request.user.sub },
    });

    return { ad: { id: ad.id } };
  });

  app.delete('/ads/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const me = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!me?.isAdmin) return reply.status(403).send({ message: 'Acceso restringido.' });

    const { id } = request.params as { id: string };
    await prisma.adCreative.deleteMany({ where: { id } });

    return { ok: true };
  });

  /** Contador de uso — ajuda a saber qual criativo vale repetir. */
  app.post('/ads/:id/download', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };

    await prisma.adCreative
      .update({ where: { id }, data: { downloads: { increment: 1 } } })
      .catch(() => undefined);

    return { ok: true };
  });
}
