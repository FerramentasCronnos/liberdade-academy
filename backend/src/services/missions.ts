import { prisma } from '../lib/prisma.js';
import { addPoints } from '../lib/points.js';

/**
 * Missões automáticas: creditadas por evento do próprio sistema, sem print.
 *
 * O slug é o contrato entre o evento e a linha da tabela Mission — mudar o
 * slug aqui exige mudar o seed.
 */
export const AUTO_MISSIONS = {
  postCommunity: 'postar-comunidade',
  engageCommunity: 'engajar-comunidade',
} as const;

export type AutoMissionSlug = (typeof AUTO_MISSIONS)[keyof typeof AUTO_MISSIONS];

/**
 * Tenta creditar uma missão automática.
 *
 * Silencioso de propósito: é chamada dentro de "curtir" e "publicar", e uma
 * falha na gamificação não pode derrubar a ação principal do usuário.
 */
export async function tryCompleteAutoMission(userId: string, slug: AutoMissionSlug) {
  try {
    const mission = await prisma.mission.findUnique({ where: { slug } });
    if (!mission?.active) return null;

    const last = await prisma.missionCompletion.findFirst({
      where: { userId, missionId: mission.id, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });

    if (last) {
      // não repetível e já feita uma vez
      if (!mission.repeatable) return null;

      if (mission.cooldownHours) {
        const readyAt = last.createdAt.getTime() + mission.cooldownHours * 3600_000;
        if (Date.now() < readyAt) return null;
      }
    }

    const completion = await prisma.$transaction(async (tx) => {
      const created = await tx.missionCompletion.create({
        data: {
          missionId: mission.id,
          userId,
          status: 'approved',
          pointsAwarded: mission.points,
          reviewedAt: new Date(),
        },
      });

      await addPoints(
        userId,
        mission.points,
        `Missão: ${mission.title}`,
        { type: 'mission', id: mission.id },
        tx,
      );

      return created;
    });

    return completion;
  } catch {
    return null;
  }
}

/** Quando a missão repetível fica disponível de novo. */
export function nextAvailableAt(
  lastAt: Date | null,
  cooldownHours: number | null,
): Date | null {
  if (!lastAt || !cooldownHours) return null;
  return new Date(lastAt.getTime() + cooldownHours * 3600_000);
}
