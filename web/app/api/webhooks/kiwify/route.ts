import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { grantAccess } from '@/lib/access';
import { sendAccessEmail } from '@/lib/email';

/**
 * Webhook da Kiwify: compra aprovada vira acesso na hora.
 *
 * A Kiwify assina cada chamada com HMAC-SHA1 do corpo bruto usando o token
 * definido ao criar o webhook, e manda o resultado no parâmetro `signature`
 * da URL. Por isso o corpo é lido como texto antes de qualquer parse.
 *
 * Só o evento de compra aprovada cria conta. Os outros (pix gerado, reembolso,
 * chargeback) são aceitos com 200 para a Kiwify não ficar reenviando, mas não
 * fazem nada por enquanto.
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

  const approved =
    payload.webhook_event_type === 'order_approved' || payload.order_status === 'paid';
  const email = payload.Customer?.email?.trim().toLowerCase();

  if (!approved || !email) {
    return NextResponse.json({ ok: true, ignored: payload.webhook_event_type ?? 'sem evento' });
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
