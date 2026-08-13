import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import { serializeUser } from './domain/serialize';

/**
 * Sessão do membro.
 *
 * Antes isto conversava por HTTP com uma API separada. Agora tudo roda no
 * mesmo processo, então lemos o banco direto — sem salto de rede, sem CORS e
 * sem manter dois deploys em sincronia.
 */

const COOKIE = 'la_token';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET não configurado.');
  return new TextEncoder().encode(value);
}

export type SessionUser = ReturnType<typeof serializeUser>;

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, // fora do alcance de JS, evita roubo por XSS
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Id do usuário logado, ou null. Não toca no banco. */
export async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    // expirado ou adulterado
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const id = await getUserId();
  if (!id) return null;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? serializeUser(user) : null;
  } catch {
    // banco fora do ar não pode derrubar a página inteira
    return null;
  }
}

/** Para telas que exigem login: devolve o id ou lança para o caller redirecionar. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error('UNAUTHENTICATED');
  return id;
}

export async function isAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}
