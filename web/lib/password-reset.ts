import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * "Olvidé mi contraseña".
 *
 * O link do e-mail carrega um JWT de 1 hora assinado com o JWT_SECRET, com o
 * fim do hash atual da senha dentro: trocada a senha, o mesmo link deixa de
 * valer (uso único sem tabela nova). Só conta com acesso vigente recebe o
 * e-mail; quem foi bloqueado por reembolso não consegue reabrir a conta por
 * aqui. A resposta para o formulário é sempre a mesma, para não revelar se
 * o e-mail existe.
 */
const REVOKED = 'kiwify_refunded';
const TTL = '1h';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET não configurado.');
  return new TextEncoder().encode(value);
}

function hasActiveAccess(user: { planSource: string | null; planExpiresAt: Date | null; isAdmin: boolean }) {
  if (user.isAdmin) return true;
  if (user.planSource === REVOKED) return false;
  if (user.planExpiresAt && user.planExpiresAt.getTime() < Date.now()) return false;
  return true;
}

export async function requestPasswordReset(rawEmail: string): Promise<{ sent: boolean; reason?: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes('@')) return { sent: false, reason: 'email' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { sent: false, reason: 'not_found' };
  if (!hasActiveAccess(user)) return { sent: false, reason: 'inactive' };

  const token = await new SignJWT({ purpose: 'reset', pw: user.passwordHash.slice(-12) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret());

  const url = `${process.env.APP_URL || 'https://catalogo.s4accelerator.com'}/recuperar/${token}`;
  const result = await sendPasswordResetEmail({ name: user.name, email: user.email, url });
  return { sent: result.ok, reason: result.ok ? undefined : result.error };
}

export async function verifyResetToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== 'reset' || typeof payload.sub !== 'string') return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { passwordHash: true } });
    // senha já trocada depois do e-mail: link usado ou obsoleto
    if (!user || user.passwordHash.slice(-12) !== payload.pw) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function resetPasswordWithToken(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (password.length < 6) return { ok: false, error: 'La contraseña necesita al menos 6 caracteres.' };
  const verified = await verifyResetToken(token);
  if (!verified) return { ok: false, error: 'El enlace venció o ya fue usado. Pide uno nuevo.' };
  await prisma.user.update({
    where: { id: verified.userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true };
}
