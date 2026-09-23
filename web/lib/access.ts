import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

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
  /** De onde veio: kiwify | manual ... */
  source: string;
}): Promise<GrantResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || email.split('@')[0];
  const stamp = { planSource: input.source, planUpdatedAt: new Date(), planExpiresAt: null };

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.planSource !== REVOKED) {
    await prisma.user.update({ where: { id: existing.id }, data: stamp });
    return { created: false, userId: existing.id, name: existing.name, email };
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    // voltou depois de um reembolso: reativa com senha nova
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, ...stamp } });
    return { created: true, userId: existing.id, name: existing.name, email, password };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash, onboardingCompleted: true, ...stamp },
  });
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
