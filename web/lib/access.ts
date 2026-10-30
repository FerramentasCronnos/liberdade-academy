import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { tierOfProduct } from '@/lib/purchase-tier';

/**
 * Concessão e bloqueio de acesso de compradores.
 *
 * Usado pelo webhook de checkout e pela administração. Se já existe conta
 * com o e-mail, a senha não muda: a pessoa pode estar usando a atual. A
 * exceção é a conta bloqueada por reembolso, que ganha senha nova ao
 * comprar de novo.
 *
 * O bloqueio troca a senha por um hash aleatório em vez de apagar a conta:
 * posts, pontos e histórico ficam preservados para uma eventual volta.
 */
const REVOKED = 'kiwify_refunded';

/**
 * Avisa a automação de boas-vindas da própria equipe (LeadConnector, env
 * ACCESS_WEBHOOK_URL) que um acesso foi criado, com e-mail e senha, para o
 * WhatsApp de boas-vindas. Só em criação, nunca em troca de senha. Uma
 * falha não bloqueia a criação: fica no log.
 */
export async function notifyAccessWebhook(input: { email: string; password: string; name?: string }) {
  const url = process.env.ACCESS_WEBHOOK_URL;
  if (!url) return { sent: false as const, reason: 'ACCESS_WEBHOOK_URL não configurada' };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email, senha: input.password, name: input.name ?? '', platform: 'MVA' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error(`[access-webhook] ${response.status} para ${input.email}`);
    return { sent: response.ok, status: response.status };
  } catch (error) {
    console.error('[access-webhook] falhou', input.email, error);
    return { sent: false as const, reason: error instanceof Error ? error.message : 'erro' };
  }
}

/** Guarda o nome do produto comprado sem repetir. */
export async function recordPurchase(userId: string, product: string) {
  const name = product.trim();
  if (!name) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { purchases: true } });
  if (!user || user.purchases.some((p) => p.toLowerCase() === name.toLowerCase())) return;
  await prisma.user.update({ where: { id: userId }, data: { purchases: { push: name } } });
}

/** Mesmo que recordPurchase, localizando pelo e-mail (webhooks). */
export async function recordPurchaseByEmail(email: string, product: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  if (user) await recordPurchase(user.id, product);
}

/**
 * Reembolso de um upsell (Franquia, Golden Ticket) tira só aquele produto da
 * lista; o acesso à plataforma vem do produto principal e continua.
 * Devolve false quando o produto não é upsell (aí o chamador revoga o acesso).
 */
export async function dropUpsellPurchaseByEmail(email: string, product: string | undefined) {
  if (!product || !tierOfProduct(product)) return false;
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, purchases: true } });
  if (!user) return true;
  const rest = user.purchases.filter((p) => p.toLowerCase() !== product.trim().toLowerCase());
  if (rest.length !== user.purchases.length) await prisma.user.update({ where: { id: user.id }, data: { purchases: rest } });
  return true;
}

/** Senha legível, sem caracteres que se confundem (0/O, 1/l/I). */
export function generatePassword(length = 10) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export type GrantResult =
  | { created: true; userId: string; name: string; email: string; password: string }
  | { created: false; userId: string; name: string; email: string };

export async function grantAccess(input: {
  name?: string;
  email: string;
  /** De onde veio: kiwify | hotmart | stripe | manual ... */
  source: string;
  password?: string;
  resetPassword?: boolean;
  /** Nome do produto comprado (define o nível: principal, Franquia, Golden Ticket). */
  product?: string;
}): Promise<GrantResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || email.split('@')[0];
  const stamp = { planSource: input.source, planUpdatedAt: new Date(), planExpiresAt: null };

  const existing = await prisma.user.findUnique({ where: { email } });
  // compra nova de quem já tem conta (upsell): só registra o produto
  if (existing && input.product) await recordPurchase(existing.id, input.product);

  if (existing && existing.planSource !== REVOKED && !input.resetPassword && !input.password) {
    // Já tem acesso ativo: mantém a origem que liberou primeiro, para o reembolso de outra loja
    // (ex.: Brain Academy) não derrubar quem pagou pela Hotmart.
    await prisma.user.update({
      where: { id: existing.id },
      data: { ...stamp, planSource: existing.planSource || input.source },
    });
    return { created: false, userId: existing.id, name: existing.name, email };
  }

  const password = input.password || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    // voltou depois de um reembolso ou solicitou redefinição de senha: grava e avisa webhook
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, ...stamp } });
    await notifyAccessWebhook({ email, password, name: existing.name });
    return { created: true, userId: existing.id, name: existing.name, email, password };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash, onboardingCompleted: true, ...stamp, purchases: input.product ? [input.product.trim()] : [] },
  });
  await notifyAccessWebhook({ email, password, name });
  return { created: true, userId: user.id, name, email, password };
}

/**
 * Bloqueia o login sem apagar a conta. Admins nunca são bloqueados por webhook.
 * Com `onlySource`, só bloqueia quem entrou por aquela plataforma: um reembolso
 * na Hotmart não derruba quem comprou pela Kiwify.
 */
export async function revokeAccess(email: string, onlySource?: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.isAdmin) return { revoked: false as const };
  if (onlySource && user.planSource !== onlySource) return { revoked: false as const };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
      plan: 'free',
      planSource: REVOKED,
      planExpiresAt: new Date(),
      planUpdatedAt: new Date(),
    },
  });
  return { revoked: true as const };
}
