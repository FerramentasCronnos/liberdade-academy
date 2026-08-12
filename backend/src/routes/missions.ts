import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addPoints } from '../lib/points.js';
import { nextAvailableAt } from '../services/missions.js';

const submitSchema = z.object({
  proofUrl: z.string().url().optional(),
  note: z.string().trim().max(500).optional(),
});

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export async function missionRoutes(app: FastifyInstance) {
  /** Missões + o estado de cada uma para quem está logado. */
  app.get('/missions', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.user.sub;

    const missions = await prisma.mission.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { points: 'asc' }],
      include: {
        completions: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      missions: missions.map((mission) => {
        const last = mission.completions[0] ?? null;
        const approved = last?.status === 'approved';
        const availableAt = approved
          ? nextAvailableAt(last.createdAt, mission.cooldownHours)
          : null;

        const locked =
          approved && (!mission.repeatable || (availableAt ? availableAt > new Date() : false));

        return {
          id: mission.id,
          slug: mission.slug,
          title: mission.title,
          description: mission.description,
          points: mission.points,
          category: mission.category,
          kind: mission.kind,
          repeatable: mission.repeatable,
          status: last?.status ?? 'available',
          locked,
          availableAt: availableAt?.toISOString() ?? null,
          completedAt: approved ? last.createdAt.toISOString() : null,
        };
      }),
    };
  });

  /** Envio de comprovação. Fica pendente até revisão — não credita na hora. */
  app.post('/missions/:id/submit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = submitSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Dados inválidos.' });
    }

    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission?.active) return reply.status(404).send({ message: 'Missão não encontrada.' });

    if (mission.kind === 'automatic') {
      return reply
        .status(400)
        .send({ message: 'Esta missão é creditada automaticamente pelo sistema.' });
    }

    const existing = await prisma.missionCompletion.findFirst({
      where: { missionId: id, userId: request.user.sub, status: { in: ['pending', 'approved'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.status === 'pending') {
      return reply.status(409).send({ message: 'Você já tem um envio em análise.' });
    }
    if (existing?.status === 'approved' && !mission.repeatable) {
      return reply.status(409).send({ message: 'Missão já concluída.' });
    }

    const completion = await prisma.missionCompletion.create({
      data: {
        missionId: id,
        userId: request.user.sub,
        status: 'pending',
        proofUrl: parsed.data.proofUrl,
        note: parsed.data.note,
      },
    });

    return { completion: { id: completion.id, status: completion.status } };
  });

  /** Fila de revisão — só admin. */
  app.get('/missions/reviews', { preHandler: [app.authenticate] }, async (request, reply) => {
    const me = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!me?.isAdmin) return reply.status(403).send({ message: 'Acesso restrito.' });

    const pending = await prisma.missionCompletion.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { mission: true, user: true },
    });

    return {
      reviews: pending.map((item) => ({
        id: item.id,
        proofUrl: item.proofUrl,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
        mission: { title: item.mission.title, points: item.mission.points },
        user: { id: item.user.id, name: item.user.name, email: item.user.email },
      })),
    };
  });

  app.post(
    '/missions/reviews/:completionId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const me = await prisma.user.findUnique({ where: { id: request.user.sub } });
      if (!me?.isAdmin) return reply.status(403).send({ message: 'Acesso restrito.' });

      const { completionId } = request.params as { completionId: string };
      const parsed = reviewSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: 'Status inválido.' });

      const completion = await prisma.missionCompletion.findUnique({
        where: { id: completionId },
        include: { mission: true },
      });
      if (!completion) return reply.status(404).send({ message: 'Envio não encontrado.' });
      if (completion.status !== 'pending') {
        return reply.status(409).send({ message: 'Este envio já foi revisado.' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.missionCompletion.update({
          where: { id: completionId },
          data: {
            status: parsed.data.status,
            reviewedAt: new Date(),
            pointsAwarded: parsed.data.status === 'approved' ? completion.mission.points : 0,
          },
        });

        if (parsed.data.status === 'approved') {
          await addPoints(
            completion.userId,
            completion.mission.points,
            `Missão: ${completion.mission.title}`,
            { type: 'mission', id: completion.missionId },
            tx,
          );
        }
      });

      return { ok: true };
    },
  );

  /**
   * Resumo do saldo.
   * "acumulado" soma só os créditos e "resgatado" só os débitos — assim o
   * membro vê quanto ganhou na vida, não apenas o que sobrou.
   */
  app.get('/points/summary', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.user.sub;

    const [credits, debits, user] = await Promise.all([
      prisma.pointsEntry.aggregate({
        where: { userId, points: { gt: 0 } },
        _sum: { points: true },
      }),
      prisma.pointsEntry.aggregate({
        where: { userId, points: { lt: 0 } },
        _sum: { points: true },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    return {
      balance: user?.points ?? 0,
      accumulated: credits._sum.points ?? 0,
      redeemed: Math.abs(debits._sum.points ?? 0),
    };
  });

  /** Extrato de pontos do usuário. */
  app.get('/points/entries', { preHandler: [app.authenticate] }, async (request) => {
    const entries = await prisma.pointsEntry.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        points: entry.points,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  });
}
