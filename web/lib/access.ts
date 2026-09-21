import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/**
 * Concessão de acesso a um comprador.
 *
 * Usada pelo webhook de checkout e pela administração. Se já existe conta
 * com o e-mail, não mexe na senha: a pessoa pode estar usando a atual.
 */

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { planSource: input.source, planUpdatedAt: new Date() },
    });
    return { created: false, userId: existing.id, name: existing.name, email };
  }

  const password = generatePassword();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      onboardingCompleted: true,
      planSource: input.source,
      planUpdatedAt: new Date(),
    },
  });

  return { created: true, userId: user.id, name, email, password };
}
