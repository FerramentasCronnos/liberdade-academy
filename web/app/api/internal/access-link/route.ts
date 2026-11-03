import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buyerPhone, notifyAccessLink } from '@/lib/access';
import { hottoks } from '@/lib/hotmart';

export const dynamic = 'force-dynamic';

/**
 * A área de membros do MVA (academy.s4accelerator.com) manda aqui o link de criar a senha de quem acabou de comprar;
 * o catálogo repassa para a automação de boas-vindas (ACCESS_WEBHOOK_URL). A chave é derivada do hottok que a área de
 * membros já usa para avisar as vendas: sem variável nova.
 */
function authorized(header: string | null) {
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return false;
  return hottoks().some((h) => {
    const key = createHmac('sha256', h).update('academy-access-link-v1').digest('hex');
    const a = Buffer.from(token);
    const b = Buffer.from(key);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const link = typeof body.link === 'string' ? body.link.trim() : '';
  if (!email.includes('@') || !/^https:\/\//.test(link)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 422 });
  const result = await notifyAccessLink({
    email,
    link,
    name: typeof body.name === 'string' ? body.name.trim() : '',
    phone: buyerPhone(typeof body.phone === 'string' ? body.phone : null),
  });
  return NextResponse.json({ ok: true, sent: result.sent });
}
