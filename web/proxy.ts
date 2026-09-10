import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Barreira de login na frente de todo o site.
 *
 * Antes cada página decidia sozinha se exigia sessão, e o catálogo ficou
 * aberto. Aqui a regra é uma só: sem cookie válido, vai para /login. As
 * páginas continuam checando por conta própria — Server Functions e
 * navegações entre rotas irmãs não passam necessariamente por aqui.
 *
 * Só a assinatura do JWT é verificada, sem tocar no banco: um usuário
 * apagado ainda cai na checagem das páginas, que consultam o Prisma.
 */
const COOKIE = 'la_token';

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false; // expirado ou adulterado
  }
}

export async function proxy(request: NextRequest) {
  if (await hasValidSession(request)) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  /*
   * Fica de fora, e portanto público:
   * - api        → protegidas por CRON_SECRET ou usadas pelas páginas públicas
   * - login      → senão vira loop
   * - p/, bio/   → presell e link-na-bio dos membros; são feitas para a audiência
   * - _next, favicon e arquivos com extensão → estáticos
   */
  matcher: ['/((?!api|login|p/|bio/|_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
};
