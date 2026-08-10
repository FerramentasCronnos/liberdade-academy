import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

export async function rankingRoutes(app: FastifyInstance) {
  app.get('/ranking', { preHandler: [app.authenticate] }, async (request) => {
    const cached = await cacheGet<{ ranking: unknown[] }>('ranking:all');
    if (cached) return cached;

    const users = await prisma.user.findMany({
      where: { onboardingCompleted: true },
      orderBy: [{ xp: 'desc' }, { salesMade: 'desc' }],
      take: 50,
    });

    const ranking = users.map((user, index) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar ?? undefined,
      level: user.level,
      xp: user.xp,
      rank: index + 1,
      salesCount: user.salesMade,
      badge: index === 0 ? 'top' : undefined,
    }));

    // sync ranks
    await Promise.all(
      ranking.map((item) =>
        prisma.user.update({
          where: { id: item.id },
          data: { rank: item.rank },
        }),
      ),
    );

    const payload = { ranking };
    await cacheSet('ranking:all', payload, 60);
    return payload;
  });

  app.get('/ranking/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
    });
    return {
      me: {
        id: user.id,
        name: user.name,
        level: user.level,
        xp: user.xp,
        rank: user.rank,
        salesCount: user.salesMade,
      },
    };
  });
}
