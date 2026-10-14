import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { grantCreatorsAccess, revokeCreatorsAccess } from '@/lib/creators-access';

/**
 * Webhook da Stripe: assinatura da aba Creators (US$ 20/mês).
 *
 * A Stripe assina cada chamada no header `stripe-signature` sobre o corpo
 * bruto, então o corpo é lido como texto antes de qualquer parse. Assinatura
 * inválida devolve 400; tudo o mais devolve 200 para a Stripe não ficar
 * reenviando — um evento desconhecido ou um usuário que ainda não existe na
 * plataforma não é erro nosso.
 *
 * Fluxo: checkout.session.completed libera na hora (sem vencimento) e guarda o
 * customer; customer.subscription.* ajusta o vencimento ao fim do período ou
 * bloqueia; invoice.paid estende a cada renovação.
 */
export const runtime = 'nodejs';

const ACTIVE: ReadonlySet<string> = new Set(['active', 'trialing']);
const INACTIVE: ReadonlySet<string> = new Set(['past_due', 'canceled', 'unpaid', 'incomplete_expired']);

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function toDate(seconds?: number | null) {
  return typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000) : null;
}

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/** E-mail do customer na Stripe; null se foi apagado ou a chamada falhou. */
async function customerEmail(stripe: Stripe, id: string | null) {
  if (!id) return null;
  try {
    const customer = await stripe.customers.retrieve(id);
    if (customer.deleted) return null;
    return customer.email?.trim().toLowerCase() ?? null;
  } catch (error) {
    console.error(`[stripe] falha ao buscar customer ${id}`, error);
    return null;
  }
}

/**
 * Resolve o e-mail do membro para um evento de assinatura/fatura. A busca por
 * customer só funciona depois que o checkout salvou o id; quando o usuário
 * ainda não está vinculado, perguntamos à Stripe pelo e-mail do customer.
 */
async function resolveEmail(stripe: Stripe, custId: string | null, fallback?: string | null) {
  const direct = fallback?.trim().toLowerCase();
  if (direct) return direct;
  return customerEmail(stripe, custId);
}

async function applyAccess(
  stripe: Stripe,
  input: { custId: string | null; email?: string | null; until: Date | null },
) {
  // primeiro tenta pelo customer já vinculado (não gasta chamada à Stripe)
  if (input.custId) {
    const byCustomer = await grantCreatorsAccess({ email: '', until: input.until, stripeCustomerId: input.custId });
    if (byCustomer.ok) return byCustomer;
  }
  const email = await resolveEmail(stripe, input.custId, input.email);
  if (!email) return { ok: false as const, reason: 'no_email' as const };
  return grantCreatorsAccess({ email, until: input.until, stripeCustomerId: input.custId });
}

async function removeAccess(stripe: Stripe, custId: string | null, email?: string | null) {
  if (custId) {
    const byCustomer = await revokeCreatorsAccess({ stripeCustomerId: custId });
    if (byCustomer.ok) return byCustomer;
  }
  const resolved = await resolveEmail(stripe, custId, email);
  if (!resolved) return { ok: false as const, reason: 'no_email' as const };
  return revokeCreatorsAccess({ email: resolved });
}

/** Stripe v23: o fim do período vive em cada item, não mais na assinatura. */
function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((n): n is number => typeof n === 'number');
  return ends.length ? toDate(Math.max(...ends)) : null;
}

function invoicePeriodEnd(invoice: Stripe.Invoice) {
  const ends = invoice.lines.data
    .map((line) => line.period?.end)
    .filter((n): n is number => typeof n === 'number');
  return ends.length ? toDate(Math.max(...ends)) : toDate(invoice.period_end);
}

async function handleEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = session.customer_details?.email ?? session.customer_email ?? undefined;
      const custId = customerId(session.customer);
      const userId = session.client_reference_id ?? undefined; // vem do checkout embutido
      if (!email && !userId) return { handled: true, note: 'checkout sem e-mail nem referência' };
      // libera já; o evento da assinatura chega logo depois com o vencimento
      return grantCreatorsAccess({ userId, email, until: null, stripeCustomerId: custId });
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const custId = customerId(subscription.customer);
      if (ACTIVE.has(subscription.status)) {
        return applyAccess(stripe, { custId, until: subscriptionPeriodEnd(subscription) });
      }
      if (INACTIVE.has(subscription.status)) {
        return removeAccess(stripe, custId);
      }
      // incomplete, paused: ainda não pagou ou pausou; não mexe
      return { handled: true, note: `status ${subscription.status} ignorado` };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      return removeAccess(stripe, customerId(subscription.customer));
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      // só faturas de assinatura estendem o acesso
      if (invoice.parent?.type && invoice.parent.type !== 'subscription_details') {
        return { handled: true, note: 'fatura sem assinatura' };
      }
      const custId = customerId(invoice.customer);
      return applyAccess(stripe, { custId, email: invoice.customer_email, until: invoicePeriodEnd(invoice) });
    }

    default:
      return { handled: false, note: `evento ${event.type} ignorado` };
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = stripeClient();
  if (!secret || !stripe) {
    return NextResponse.json(
      { message: 'STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET não configurados.' },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ message: 'Assinatura ausente.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error('[stripe] assinatura inválida', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Assinatura inválida.' }, { status: 400 });
  }

  try {
    const result = await handleEvent(stripe, event);
    return NextResponse.json({ ok: true, type: event.type, result });
  } catch (error) {
    // 200 mesmo assim: a Stripe reenviaria e o erro é nosso para investigar no log
    console.error(`[stripe] falha ao processar ${event.type} (${event.id})`, error);
    return NextResponse.json({ ok: true, type: event.type, error: 'processing_failed' });
  }
}
