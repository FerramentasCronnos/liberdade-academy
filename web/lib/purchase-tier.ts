/**
 * Nível de compra do membro nas ofertas próprias (Bank Offers).
 *
 * Decidido pelos nomes dos produtos comprados (Hotmart, Kiwify, Stripe):
 *   main  = só o produto principal (MVA)
 *   up1   = comprou o upsell 1 "Franquia"
 *   up2   = comprou o upsell 2 "Golden Ticket"
 * Cada nível libera o pedido de afiliação do seu próprio link e recebe o
 * convite para o próximo nível (ou a lista de espera da mentoria no topo).
 */
export type PurchaseTier = 'main' | 'up1' | 'up2';

export function purchaseTier(purchases: string[] | null | undefined): PurchaseTier {
  const names = (purchases ?? []).map((n) => n.toLowerCase());
  if (names.some((n) => /golden/.test(n))) return 'up2';
  if (names.some((n) => /franqui/.test(n))) return 'up1';
  return 'main';
}

/** Onde cada nível pede seus links de afiliação (leva ao Telegram). */
export const AFFILIATE_REQUEST_URL: Record<PurchaseTier, string> = {
  main: 'https://lp.theaffiliatecentral.com/Network_MVA',
  up1: 'https://lp.theaffiliatecentral.com/Network_MVA_Franquia',
  up2: 'https://lp.theaffiliatecentral.com/Network_MVA_Golden',
};

/** Próximo passo de cada nível: página de vendas do upsell seguinte ou a lista de espera da mentoria. */
export function upgradeFor(tier: PurchaseTier): { label: string; hint: string; url?: string } {
  if (tier === 'main') {
    return {
      label: '¿Quieres aumentar tu comisión? Conoce la Franquicia',
      hint: 'Con la Franquicia desbloqueas comisiones mayores en todas las Bank Offers.',
      url: process.env.BANK_OFFERS_VSL_UP1 || undefined,
    };
  }
  if (tier === 'up1') {
    return {
      label: '¿Quieres aumentar aún más tu comisión? Golden Ticket',
      hint: 'El Golden Ticket es el nivel máximo de comisión de la red.',
      url: process.env.BANK_OFFERS_VSL_UP2 || undefined,
    };
  }
  return {
    label: 'Lista de espera de la mentoría',
    hint: 'Como Golden Ticket, tienes prioridad para la mentoría.',
    url: process.env.BANK_OFFERS_MENTORIA_URL || undefined,
  };
}
