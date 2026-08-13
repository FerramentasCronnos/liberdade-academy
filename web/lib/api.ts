import type { ApiProduct, Marketplace, Product } from './types';

/**
 * Mercado do catálogo. O backend é multi-região; isto decide o que a vitrine
 * mostra. Trocar aqui (ou via env) muda o app inteiro.
 */
export const CATALOG_REGION = process.env.NEXT_PUBLIC_CATALOG_REGION || 'US';

/**
 * De onde o produto veio.
 *
 * Hoje o backend só sincroniza TikTok Shop, então a origem é fixa. Quando
 * entrarem Shopee / Mercado Livre / Amazon, isto vira um campo do banco
 * (`Product.marketplace`) e esta função some.
 */
function resolveMarketplace(_product: ApiProduct): Marketplace {
  return 'tiktok_shop';
}

export function toProduct(raw: ApiProduct): Product {
  // taxa real da fonte tem prioridade; a configurada entra como estimativa
  const rate = raw.commission ?? raw.commissionEstimated ?? null;
  const commissionValue = rate == null ? null : Number((raw.price * rate) / 100);

  return {
    ...raw,
    marketplace: resolveMarketplace(raw),
    commissionValue,
  };
}

export function formatPrice(value: number, currency = 'BRL') {
  return value.toLocaleString(currency === 'USD' ? 'en-US' : 'es-419', {
    style: 'currency',
    currency,
  });
}

export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}K`;
  return String(value);
}
