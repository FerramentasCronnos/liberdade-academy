import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/session';

/**
 * Cria a sessão do Checkout embutido da Stripe para a assinatura Creators.
 *
 * Embutido (ui_mode: 'embedded') para o pagamento acontecer dentro da
 * plataforma, sem sair para a página da Stripe. O usuário logado vai como
 * client_reference_id e customer_email: é por isso que o webhook consegue
 * ligar o pagamento à conta certa mesmo se a pessoa digitar outro e-mail.
 */
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // diagnóstico pela equipe: CRON_SECRET + userId na query cria a sessão sem cookie de login
  const url = new URL(request.url);
  const bearer = request.headers.get('authorization');
  const viaSecret = Boolean(process.env.CRON_SECRET) && bearer === `Bearer ${process.env.CRON_SECRET}` && url.searchParams.get('userId');
  const userId = viaSecret ? url.searchParams.get('userId') : await getUserId();
  if (!userId) return NextResponse.json({ message: 'Inicia sesión.' }, { status: 401 });

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.CREATORS_PRICE_ID;
  if (!secret || !price) {
    return NextResponse.json({ message: 'El pago todavía no está configurado.' }, { status: 503 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, stripeCustomerId: true } });
  if (!user) return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });

  const origin = process.env.APP_URL || url.origin;
  const stripe = new Stripe(secret);
  try {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ui_mode: 'embedded_page',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    return_url: `${origin}/creators?session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: true,
    locale: 'es',
  });

  return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    // a mensagem da Stripe vai na resposta: sem ela o botão só diz "no pude iniciar"
    const message = error instanceof Error ? error.message : 'Stripe no respondió.';
    console.error('[stripe-checkout]', message);
    return NextResponse.json({ message: `No pude iniciar el pago: ${message}` }, { status: 502 });
  }
}
