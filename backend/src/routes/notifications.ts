import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [app.authenticate] }, async (request) => {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: null }, { userId: request.user.sub }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        reads: {
          where: { userId: request.user.sub },
        },
      },
    });

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        route: n.route ?? undefined,
        createdAt: n.createdAt.toISOString(),
        read: n.reads.length > 0,
      })),
      unreadCount: notifications.filter((n) => n.reads.length === 0).length,
    };
  });

  app.post('/notifications/read', { preHandler: [app.authenticate] }, async (request) => {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: null }, { userId: request.user.sub }],
      },
      select: { id: true },
    });

    await Promise.all(
      notifications.map((n) =>
        prisma.notificationRead.upsert({
          where: {
            userId_notificationId: {
              userId: request.user.sub,
              notificationId: n.id,
            },
          },
          update: {},
          create: {
            userId: request.user.sub,
            notificationId: n.id,
          },
        }),
      ),
    );

    return { ok: true };
  });
}
