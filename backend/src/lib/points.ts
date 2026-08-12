import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma.js';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Crédito/débito de pontos.
 *
 * Sempre grava no extrato (PointsEntry) junto com o saldo em User.points, na
 * mesma transação — se as duas coisas não caírem juntas, o histórico deixa de
 * bater com o saldo e ninguém consegue auditar.
 */
export async function addPoints(
  userId: string,
  points: number,
  reason: string,
  ref?: { type: string; id: string },
  tx: Tx = prisma,
) {
  if (points === 0) return;

  await tx.pointsEntry.create({
    data: { userId, points, reason, refType: ref?.type, refId: ref?.id },
  });

  await tx.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
  });
}

/** Saldo recalculado do extrato — usado para conferir se o cache bate. */
export async function computeBalance(userId: string, tx: Tx = prisma) {
  const result = await tx.pointsEntry.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}
