import { NextResponse } from 'next/server';
import { grantAccess, revokeAccess } from '@/lib/access';
import { sendAccessEmail } from '@/lib/email';

/**
 * Webhook da Hotmart (versão 2.0.0): acesso em tempo real.
 *
 * A Hotmart manda o hottok do webhook no header X-HOTMART-HOTTOK. Enquanto
 * HOTMART_HOTTOK não estiver configurado, a rota responde 503 e o cron de
 * sincronização cobre as compras.
 */
interface HotmartEvent {
  event?: string;
  data?: {
    buyer?: { email?: string; name?: string };
    purchase?: { status?: string; transaction?: string };
  };
}

const GRANT = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
const REVOKE = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'PURCHASE_PROTEST'];

export async function POST(request: Request) {
  const hottok = process.env.HOTMART_HOTTOK;
  if (!hottok) return NextResponse.json({ message: 'HOTMART_HOTTOK não configurado.' }, { status: 503 });
  if (request.headers.get('x-hotmart-hottok') !== hottok) {
    return NextResponse.json({ message: 'Hottok inválido.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as HotmartEvent;
  const event = payload.event ?? '';
  const email = payload.data?.buyer?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: true, ignored: event || 'sem evento' });

  if (REVOKE.includes(event)) {
    const result = await revokeAccess(email, 'hotmart');
    return NextResponse.json({ ok: true, revoked: result.revoked, email });
  }

  if (!GRANT.includes(event)) return NextResponse.json({ ok: true, ignored: event });

  const result = await grantAccess({ name: payload.data?.buyer?.name, email, source: 'hotmart' });
  if (!result.created) return NextResponse.json({ ok: true, created: false, email });

  const mail = await sendAccessEmail(result);
  if (!mail.ok) console.error(`[hotmart] acesso criado para ${email}, mas o e-mail falhou: ${mail.error}`);
  return NextResponse.json({ ok: true, created: true, email, emailSent: mail.ok });
}
