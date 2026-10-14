import { prisma } from '@/lib/db';

/**
 * Acesso à aba Creators: assinatura à parte (Stripe, US$ 20/mês).
 *
 * O acesso vive em duas colunas do usuário: `creatorsAccess` (ligado/desligado)
 * e `creatorsAccessUntil` (fim do período pago). O webhook da Stripe mantém as
 * duas; a administração pode ligar na mão (sem data = sem vencimento).
 * Admins sempre entram, para conseguir operar e revisar a aba.
 */

/** Link de pagamento da Stripe (Payment Link). Sem ele, o botão aparece desativado. */
export const CREATORS_CHECKOUT_URL = process.env.CREATORS_CHECKOUT_URL;

export function hasCreatorsAccess(user: {
  isAdmin: boolean;
  creatorsAccess: boolean;
  creatorsAccessUntil?: Date | string | null;
}) {
  if (user.isAdmin) return true;
  if (!user.creatorsAccess) return false;
  if (user.creatorsAccessUntil == null) return true;
  const until = new Date(user.creatorsAccessUntil);
  // data inválida vinda do banco não pode liberar de graça
  return !Number.isNaN(until.getTime()) && until.getTime() > Date.now();
}

type Lookup = { userId?: string | null; email?: string | null; stripeCustomerId?: string | null };

/** Id do membro (client_reference_id do Checkout) primeiro, depois e-mail minúsculo, depois o customer da Stripe. */
async function findUser(input: Lookup) {
  if (input.userId) {
    const byId = await prisma.user.findUnique({ where: { id: input.userId } });
    if (byId) return byId;
  }
  const email = input.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) return byEmail;
  }
  if (input.stripeCustomerId) {
    return prisma.user.findFirst({ where: { stripeCustomerId: input.stripeCustomerId } });
  }
  return null;
}

export async function grantCreatorsAccess(input: {
  /** Id do membro vindo do checkout embutido: liga o pagamento à conta certa mesmo com outro e-mail. */
  userId?: string;
  email?: string;
  /** Fim do período pago. null/undefined = sem vencimento (até o próximo evento). */
  until?: Date | null;
  stripeCustomerId?: string | null;
}) {
  const user = await findUser(input);
  if (!user) {
    console.warn(`[creators-access] grant: usuário não encontrado (${input.userId ?? input.email})`);
    return { ok: false as const, reason: 'not_found' as const };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      creatorsAccess: true,
      creatorsAccessUntil: input.until ?? null,
      // nunca apaga um customer já salvo com um vazio
      ...(input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : {}),
    },
  });
  return { ok: true as const, userId: user.id, email: user.email };
}

export async function revokeCreatorsAccess(input: Lookup) {
  const user = await findUser(input);
  if (!user) {
    console.warn(
      `[creators-access] revoke: usuário não encontrado (${input.email ?? input.stripeCustomerId ?? '?'})`,
    );
    return { ok: false as const, reason: 'not_found' as const };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { creatorsAccess: false, creatorsAccessUntil: new Date() },
  });
  return { ok: true as const, userId: user.id, email: user.email };
}

export type CreatorsAccessMember = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  creatorsAccess: boolean;
  creatorsAccessUntil?: string;
  stripeCustomerId?: string;
};

/** Lista para o painel administrativo: quem tem acesso primeiro. */
export async function listCreatorsAccessMembers(): Promise<CreatorsAccessMember[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ creatorsAccess: 'desc' }, { isAdmin: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      creatorsAccess: true,
      creatorsAccessUntil: true,
      stripeCustomerId: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isAdmin: u.isAdmin,
    creatorsAccess: u.creatorsAccess,
    creatorsAccessUntil: u.creatorsAccessUntil?.toISOString(),
    stripeCustomerId: u.stripeCustomerId ?? undefined,
  }));
}

/* ------------------------------------------------------- amostra grátis */

/** Quantos criadores por dia quem não assinou vê por inteiro; os demais ficam com cadeado. */
export const FREE_CREATORS_PER_DAY = 3;
/** Dentro de um criador grátis: vídeos e produtos visíveis sem assinatura. */
export const FREE_VIDEOS = 3;
export const FREE_PRODUCTS = 3;

export const CREATORS_BENEFITS = [
  'Ranking de los creadores que más venden en TikTok Shop US, con creadores nuevos en cada actualización',
  'Perfil completo: ingresos, crecimiento, seguidores, vistas, engagement y precio promedio',
  '20 videos y anuncios por creador, con las ventas de cada video',
  'Los 20 productos que vende cada creador, con la comisión',
  'Favoritos para armar tu lista de creadores a contactar',
  'Datos de contacto cuando están disponibles',
];

/**
 * Ids dos criadores liberados hoje para quem não assinou: 3 por dia, girando
 * pela lista (ordenada por ranking) conforme o dia — todo dia uma amostra
 * diferente, igual para todo mundo, sem guardar nada no banco.
 */
export function freeCreatorIds(idsByRank: string[], date = new Date()): string[] {
  const n = idsByRank.length;
  if (!n) return [];
  const day = Math.floor(date.getTime() / 86_400_000);
  const start = (day * FREE_CREATORS_PER_DAY) % n;
  return Array.from({ length: Math.min(FREE_CREATORS_PER_DAY, n) }, (_, i) => idsByRank[(start + i) % n]);
}
