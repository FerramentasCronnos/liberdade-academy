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
function resolveMarketplace(product: ApiProduct): Marketplace {
  const known: Marketplace[] = ['tiktok_shop', 'amazon', 'shopee', 'mercado_livre', 'bank_offers'];
  return known.includes(product.marketplace as Marketplace) ? (product.marketplace as Marketplace) : 'tiktok_shop';
}

export function toProduct(raw: ApiProduct): Product {
  // taxa real da fonte tem prioridade; a configurada entra como estimativa
  const rate = raw.commission ?? raw.commissionEstimated ?? null;
  // comissão fixa (Bank Offers) tem prioridade sobre o percentual
  const commissionValue =
    raw.commissionAmount != null ? raw.commissionAmount : rate == null ? null : Number((raw.price * rate) / 100);

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

/** "US$ 80 – US$ 289" quando há faixa; senão o preço único. */
export function formatPriceRange(price: number, priceMax?: number, currency = 'BRL') {
  if (priceMax != null && priceMax > price) return `${formatPrice(price, currency)} – ${formatPrice(priceMax, currency)}`;
  return formatPrice(price, currency);
}

/** Comissão percentual aplicada à faixa de preço: "US$ 29.60 – US$ 77.60". */
export function formatCommissionRange(price: number, priceMax: number | undefined, rate: number, currency = 'BRL') {
  const low = (price * rate) / 100;
  if (priceMax != null && priceMax > price) return `${formatPrice(low, currency)} – ${formatPrice((priceMax * rate) / 100, currency)}`;
  return formatPrice(low, currency);
}

export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}K`;
  return String(value);
}
