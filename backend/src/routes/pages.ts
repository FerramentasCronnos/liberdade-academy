import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const pageSchema = z.object({
  kind: z.enum(['presell', 'bio']).default('presell'),
  slug: z.string().trim().min(3).max(48).optional(),
  template: z.string().trim().max(40).default('minimalista'),
  title: z.string().trim().min(1).max(140),
  subtitle: z.string().trim().max(400).nullish(),
  avatar: z.string().trim().max(600).nullish(),
  /** Cores, textos, contador, escassez, pixel, links da bio. */
  config: z.record(z.string(), z.unknown()).optional(),
  published: z.boolean().optional(),
});

const groupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  inviteUrl: z.string().trim().url().max(600),
  clickLimit: z.number().int().positive().nullish(),
  active: z.boolean().optional(),
});

const rotationSchema = z.object({
  rotationAuto: z.boolean().optional(),
  defaultClickLimit: z.number().int().positive().nullish(),
});

/** Slug curto e numérico como o da referência (/p/1014). */
function randomSlug() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function deviceFrom(userAgent = '') {
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function serializePage(page: {
  id: string;
  kind: string;
  slug: string;
  template: string;
  title: string;
  subtitle: string | null;
  avatar: string | null;
  config: unknown;
  rotationAuto: boolean;
  defaultClickLimit: number | null;
  published: boolean;
  views: number;
  updatedAt: Date;
}) {
  return {
    id: page.id,
    kind: page.kind,
    slug: page.slug,
    template: page.template,
    title: page.title,
    subtitle: page.subtitle ?? undefined,
    avatar: page.avatar ?? undefined,
    config: (page.config ?? {}) as Record<string, unknown>,
    rotationAuto: page.rotationAuto,
    defaultClickLimit: page.defaultClickLimit,
    published: page.published,
    views: page.views,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function pageRoutes(app: FastifyInstance) {
  app.get('/pages', { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as { kind?: string };

    const pages = await prisma.landingPage.findMany({
      where: { userId: request.user.sub, ...(query.kind ? { kind: query.kind } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { groups: { orderBy: { order: 'asc' } } },
    });

    return {
      pages: pages.map((page) => ({
        ...serializePage(page),
        groups: page.groups.map((g) => ({
          id: g.id,
          name: g.name,
          inviteUrl: g.inviteUrl,
          clickLimit: g.clickLimit,
          clicks: g.clicks,
          active: g.active,
        })),
      })),
    };
  });

  app.post('/pages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = pageSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Dados inválidos.' });

    // tenta alguns slugs antes de desistir — colisão é rara mas possível
    let slug = parsed.data.slug ? normalizeSlug(parsed.data.slug) : randomSlug();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taken = await prisma.landingPage.findUnique({ where: { slug } });
      if (!taken) break;
      if (parsed.data.slug) {
        return reply.status(409).send({ message: 'Este endereço já está em uso.' });
      }
      slug = randomSlug();
    }

    const page = await prisma.landingPage.create({
      data: {
        userId: request.user.sub,
        kind: parsed.data.kind,
        slug,
        template: parsed.data.template,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        avatar: parsed.data.avatar,
        config: (parsed.data.config ?? {}) as object,
        published: parsed.data.published ?? false,
      },
    });

    return { page: serializePage(page) };
  });

  app.put('/pages/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = pageSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Dados inválidos.' });

    const existing = await prisma.landingPage.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!existing) return reply.status(404).send({ message: 'Página não encontrada.' });

    let slug = existing.slug;
    if (parsed.data.slug) {
      slug = normalizeSlug(parsed.data.slug);
      if (slug !== existing.slug) {
        const taken = await prisma.landingPage.findUnique({ where: { slug } });
        if (taken) return reply.status(409).send({ message: 'Este endereço já está em uso.' });
      }
    }

    const page = await prisma.landingPage.update({
      where: { id },
      data: {
        slug,
        ...(parsed.data.template !== undefined ? { template: parsed.data.template } : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.subtitle !== undefined ? { subtitle: parsed.data.subtitle } : {}),
        ...(parsed.data.avatar !== undefined ? { avatar: parsed.data.avatar } : {}),
        ...(parsed.data.config !== undefined ? { config: parsed.data.config as object } : {}),
        ...(parsed.data.published !== undefined ? { published: parsed.data.published } : {}),
      },
    });

    return { page: serializePage(page) };
  });

  app.delete('/pages/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await prisma.landingPage.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (deleted.count === 0) return reply.status(404).send({ message: 'Página não encontrada.' });

    return { ok: true };
  });

  /* ---------------------------------------------------------------- grupos */

  app.put('/pages/:id/rotation', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = rotationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Dados inválidos.' });

    const updated = await prisma.landingPage.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    if (updated.count === 0) return reply.status(404).send({ message: 'Página não encontrada.' });

    return { ok: true };
  });

  app.post('/pages/:id/groups', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = groupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Informe nome e link de convite válidos.' });
    }

    const page = await prisma.landingPage.findFirst({ where: { id, userId: request.user.sub } });
    if (!page) return reply.status(404).send({ message: 'Página não encontrada.' });

    const count = await prisma.pageGroup.count({ where: { pageId: id } });

    const group = await prisma.pageGroup.create({
      data: {
        pageId: id,
        name: parsed.data.name,
        inviteUrl: parsed.data.inviteUrl,
        clickLimit: parsed.data.clickLimit ?? null,
        order: count,
      },
    });

    return { group };
  });

  app.delete(
    '/pages/:id/groups/:groupId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id, groupId } = request.params as { id: string; groupId: string };

      const page = await prisma.landingPage.findFirst({ where: { id, userId: request.user.sub } });
      if (!page) return reply.status(404).send({ message: 'Página não encontrada.' });

      await prisma.pageGroup.deleteMany({ where: { id: groupId, pageId: id } });
      return { ok: true };
    },
  );

  /* ------------------------------------------------------------ público */

  app.get('/public/pages/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const page = await prisma.landingPage.findUnique({ where: { slug } });
    if (!page || !page.published) {
      return reply.status(404).send({ message: 'Página não encontrada.' });
    }

    prisma.landingPage
      .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
      .catch(() => undefined);

    return {
      page: {
        id: page.id,
        kind: page.kind,
        slug: page.slug,
        template: page.template,
        title: page.title,
        subtitle: page.subtitle ?? undefined,
        avatar: page.avatar ?? undefined,
        config: (page.config ?? {}) as Record<string, unknown>,
      },
    };
  });

  /**
   * Clique no botão: escolhe o grupo, registra a origem e devolve o convite.
   *
   * A escolha e o incremento vão na mesma transação — dois cliques ao mesmo
   * tempo poderiam passar do limite do grupo se lessem o contador antes de
   * qualquer um gravar.
   */
  app.post('/public/pages/:slug/click', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = (request.body ?? {}) as Record<string, string | undefined>;

    const page = await prisma.landingPage.findUnique({ where: { slug } });
    if (!page || !page.published) {
      return reply.status(404).send({ message: 'Página não encontrada.' });
    }

    const target = await prisma.$transaction(async (tx) => {
      const groups = await tx.pageGroup.findMany({
        where: { pageId: page.id, active: true },
        orderBy: { order: 'asc' },
      });
      if (groups.length === 0) return null;

      const limitFor = (g: (typeof groups)[number]) => g.clickLimit ?? page.defaultClickLimit;

      // com rotação, o primeiro que ainda não bateu o limite; sem rotação, o de
      // menos cliques (distribui parelho)
      let chosen = page.rotationAuto
        ? groups.find((g) => {
            const limit = limitFor(g);
            return limit == null || g.clicks < limit;
          })
        : [...groups].sort((a, b) => a.clicks - b.clicks)[0];

      // todos no limite: volta pro primeiro em vez de deixar o botão morto
      if (!chosen) chosen = groups[0];

      await tx.pageGroup.update({
        where: { id: chosen.id },
        data: { clicks: { increment: 1 } },
      });

      await tx.pageClick.create({
        data: {
          pageId: page.id,
          groupId: chosen.id,
          utmSource: body.utm_source?.slice(0, 120),
          utmMedium: body.utm_medium?.slice(0, 120),
          utmCampaign: body.utm_campaign?.slice(0, 120),
          utmContent: body.utm_content?.slice(0, 120),
          utmTerm: body.utm_term?.slice(0, 120),
          referrer: body.referrer?.slice(0, 300),
          device: deviceFrom(request.headers['user-agent'] ?? ''),
        },
      });

      return chosen;
    });

    if (!target) {
      return reply.status(409).send({ message: 'Nenhum grupo configurado nesta página.' });
    }

    return { url: target.inviteUrl, group: target.name };
  });

  /* -------------------------------------------------------- estatísticas */

  app.get('/pages/:id/stats', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { range?: string };

    const page = await prisma.landingPage.findFirst({
      where: { id, userId: request.user.sub },
      include: { groups: { orderBy: { order: 'asc' } } },
    });
    if (!page) return reply.status(404).send({ message: 'Página não encontrada.' });

    const days = query.range === '24h' ? 1 : query.range === '30d' ? 30 : query.range === 'all' ? 3650 : 7;
    const since = new Date(Date.now() - days * 86400_000);

    const [clicks, total, last24h, lastHour] = await Promise.all([
      prisma.pageClick.findMany({
        where: { pageId: id, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.pageClick.count({ where: { pageId: id } }),
      prisma.pageClick.count({
        where: { pageId: id, createdAt: { gte: new Date(Date.now() - 86400_000) } },
      }),
      prisma.pageClick.count({
        where: { pageId: id, createdAt: { gte: new Date(Date.now() - 3600_000) } },
      }),
    ]);

    const tally = (key: keyof (typeof clicks)[number]) => {
      const counts = new Map<string, number>();
      for (const click of clicks) {
        const value = click[key];
        if (typeof value === 'string' && value) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({ label, count }));
    };

    // série diária para o gráfico
    const series = new Map<string, number>();
    for (let i = days - 1; i >= 0; i -= 1) {
      series.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0);
    }
    for (const click of clicks) {
      const day = click.createdAt.toISOString().slice(0, 10);
      if (series.has(day)) series.set(day, (series.get(day) ?? 0) + 1);
    }

    const activeGroup = page.groups.find((g) => {
      const limit = g.clickLimit ?? page.defaultClickLimit;
      return g.active && (limit == null || g.clicks < limit);
    });

    return {
      range: query.range ?? '7d',
      clicksInRange: clicks.length,
      total,
      last24h,
      lastHour,
      activeGroup: activeGroup?.name ?? null,
      series: [...series.entries()].map(([date, count]) => ({ date, count })),
      utm: {
        source: tally('utmSource'),
        medium: tally('utmMedium'),
        campaign: tally('utmCampaign'),
        content: tally('utmContent'),
        term: tally('utmTerm'),
      },
      referrer: tally('referrer'),
      device: tally('device'),
      country: tally('country'),
      recent: clicks.slice(0, 20).map((c) => ({
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        device: c.device,
        utmSource: c.utmSource,
        referrer: c.referrer,
      })),
    };
  });
}
