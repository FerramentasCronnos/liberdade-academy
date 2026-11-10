import { prisma } from '@/lib/db';

/**
 * Uso da conta para o Admin MVA (painel geral do MVA): última entrada, último uso e o mapa de calor por dia.
 * Nunca derruba a requisição: se falhar, só fica no log.
 */

/** Dia no fuso de São Paulo (AAAA-MM-DD), o mesmo do painel. */
export function activityDay(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

async function bumpDay(userId: string, field: 'logins' | 'hits') {
  const day = activityDay();
  await prisma.userActivityDay.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, logins: field === 'logins' ? 1 : 0, hits: field === 'hits' ? 1 : 0 },
    update: { [field]: { increment: 1 } },
  });
}

/** Entrada na conta (login ou Central de ferramentas da área de membros). */
export async function recordLogin(userId: string) {
  try {
    const now = new Date();
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: now, lastSeenAt: now } });
    await bumpDay(userId, 'logins');
  } catch (error) {
    console.error('[activity] login não registrado:', (error as Error).message);
  }
}

/** Uso da conta (grava no máximo a cada 5 minutos por pessoa): base do "online agora" e do mapa de calor. */
export async function touchPresence(userId: string) {
  const stale = new Date(Date.now() - 5 * 60 * 1000);
  const updated = await prisma.user.updateMany({
    where: { id: userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: stale } }] },
    data: { lastSeenAt: new Date() },
  });
  if (updated.count) await bumpDay(userId, 'hits').catch((error) => console.error('[activity] uso não registrado:', (error as Error).message));
}
