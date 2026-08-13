import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { addPoints } from '../lib/points.js';

export async function rewardRoutes(app: FastifyInstance) {
  app.get('/rewards', { preHandler: [app.authenticate] }, async (request) => {
    const [rewards, me] = await Promise.all([
      prisma.reward.findMany({
        where: { active: true },
        orderBy: [{ order: 'asc' }, { costPoints: 'asc' }],
      }),
      prisma.user.findUnique({ where: { id: request.user.sub } }),
    ]);

    const balance = me?.points ?? 0;

    return {
      balance,
      rewards: rewards.map((reward) => ({
        id: reward.id,
        slug: reward.slug,
        title: reward.title,
        description: reward.description ?? undefined,
        image: reward.image ?? undefined,
        costPoints: reward.costPoints,
        stock: reward.stock,
        soldOut: reward.stock != null && reward.stock <= 0,
        affordable: balance >= reward.costPoints,
      })),
    };
  });

  app.get('/rewards/redemptions', { preHandler: [app.authenticate] }, async (request) => {
    const redemptions = await prisma.redemption.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      include: { reward: true },
    });

    return {
      redemptions: redemptions.map((item) => ({
        id: item.id,
        status: item.status,
        costPoints: item.costPoints,
        createdAt: item.createdAt.toISOString(),
        reward: { title: item.reward.title, image: item.reward.image ?? undefined },
      })),
    };
  });

  /**
   * Resgate. Débito de pontos, baixa de estoque e criação do pedido acontecem
   * na mesma transação — senão dá para gastar o mesmo saldo duas vezes em
   * cliques simultâneos.
   */
  app.post('/rewards/:id/redeem', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;

    try {
      const redemption = await prisma.$transaction(async (tx) => {
        const reward = await tx.reward.findUnique({ where: { id } });
        if (!reward?.active) throw new Error('REWARD_NOT_FOUND');
        if (reward.stock != null && reward.stock <= 0) throw new Error('OUT_OF_STOCK');

        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.points < reward.costPoints) throw new Error('INSUFFICIENT_POINTS');

        if (reward.stock != null) {
          await tx.reward.update({
            where: { id },
            data: { stock: { decrement: 1 } },
          });
        }

        const created = await tx.redemption.create({
          data: { rewardId: id, userId, costPoints: reward.costPoints, status: 'requested' },
        });

        await addPoints(
          userId,
          -reward.costPoints,
          `Resgate: ${reward.title}`,
          { type: 'redemption', id: created.id },
          tx,
        );

        return created;
      });

      return { redemption: { id: redemption.id, status: redemption.status } };
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'REWARD_NOT_FOUND') {
        return reply.status(404).send({ message: 'Recompensa no encontrada.' });
      }
      if (code === 'OUT_OF_STOCK') {
        return reply.status(409).send({ message: 'Recompensa agotada.' });
      }
      if (code === 'INSUFFICIENT_POINTS') {
        return reply.status(422).send({ message: 'Puntos insuficientes.' });
      }
      return reply.status(500).send({ message: 'Falló el canje.' });
    }
  });
}
