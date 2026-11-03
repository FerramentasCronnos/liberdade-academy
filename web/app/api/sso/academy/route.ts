import { NextResponse } from 'next/server';
import { academyUser, readAcademyTicket } from '@/lib/academy-sso';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Central de ferramentas da MVA Academy: bilhete assinado → sessão do catálogo → catálogo. */
export async function GET(request: Request) {
  const ticket = readAcademyTicket(new URL(request.url).searchParams.get('t'));
  if (!ticket) return NextResponse.redirect(new URL('/login', request.url), 303);
  try {
    const userId = await academyUser(ticket);
    if (!userId) return NextResponse.redirect(new URL('/login', request.url), 303);
    await createSession(userId);
  } catch (error) {
    console.error('[academy-sso] falha:', (error as Error).message);
    return NextResponse.redirect(new URL('/login', request.url), 303);
  }
  return NextResponse.redirect(new URL('/catalogo', request.url), 303);
}
