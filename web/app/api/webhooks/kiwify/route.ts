import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { grantAccess, revokeAccess } from '@/lib/access';
import { sendAccessEmail } from '@/lib/email';

/**
 * Webhook da Kiwify: compra aprovada vira acesso na hora.
 *
 * A Kiwify assina cada chamada com HMAC-SHA1 do corpo bruto usando o token
 * definido ao criar o webhook, e manda o resultado no parâmetro `signature`
 * da URL. Por isso o corpo é lido como texto antes de qualquer parse.
 *
 * Compra aprovada cria a conta; reembolso e chargeback bloqueiam o login.
 * Os demais eventos são aceitos com 200 para a Kiwify não ficar reenviando.
 */
interface KiwifyPayload {
  order_id?: string;
  order_status?: string;
  webhook_event_type?: string;
  Customer?: { full_name?: string; first_name?: string; email?: string };
  Product?: { product_id?: string; product_name?: string };
}

function signatureMatches(rawBody: string, received: string | null, token: string) {
  if (!received) return false;
  const expected = createHmac('sha1', token).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const token = process.env.KIWIFY_WEBHOOK_TOKEN;
  if (!token) {
    return NextResponse.json({ message: 'KIWIFY_WEBHOOK_TOKEN não configurado.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = new URL(request.url).searchParams.get('signature');
  if (!signatureMatches(rawBody, signature, token)) {
    return NextResponse.json({ message: 'Assinatura inválida.' }, { status: 401 });
  }

  let payload: KiwifyPayload;
  try {
    payload = JSON.parse(rawBody) as KiwifyPayload;
  } catch {
    return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 });
  }

  const event = payload.webhook_event_type ?? '';
  const status = payload.order_status ?? '';
  const email = payload.Customer?.email?.trim().toLowerCase();

  const approved = event === 'order_approved' || status === 'paid';
  const revoked =
    ['order_refunded', 'chargeback'].includes(event) ||
    ['refunded', 'chargedback'].includes(status);

  if (email && revoked) {
    const result = await revokeAccess(email);
    return NextResponse.json({ ok: true, revoked: result.revoked, email });
  }

  if (!approved || !email) {
    return NextResponse.json({ ok: true, ignored: event || 'sem evento' });
  }

  const result = await grantAccess({
    name: payload.Customer?.full_name || payload.Customer?.first_name,
    email,
    source: 'kiwify',
  });

  if (!result.created) {
    return NextResponse.json({ ok: true, created: false, email });
  }

  const mail = await sendAccessEmail(result);
  if (!mail.ok) {
    // a conta existe; o e-mail pode ser reenviado pela administração
    console.error(`[kiwify] acesso criado para ${email}, mas o e-mail falhou: ${mail.error}`);
  }

  return NextResponse.json({ ok: true, created: true, email, emailSent: mail.ok });
}
