import type { ApiProduct, Marketplace, Product } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(
  /\/$/,
  '',
);

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

export async function fetchProduct(id: string): Promise<Product | null> {
  const response = await fetch(`${API_URL}/products/${encodeURIComponent(id)}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);

  const payload = (await response.json()) as { product: ApiProduct };
  return toProduct(payload.product);
}

export interface FetchProductsParams {
  category?: string;
  q?: string;
  viral?: boolean;
  region?: string;
  limit?: number;
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  const search = new URLSearchParams();
  if (params.category && params.category !== 'todos') search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  if (params.viral) search.set('viral', 'true');
  search.set('region', params.region || CATALOG_REGION);
  // o catálogo filtra e ordena no cliente, então buscamos tudo de uma vez
  search.set('limit', String(params.limit ?? 200));

  const response = await fetch(`${API_URL}/products?${search.toString()}`, {
    // catálogo muda por sync, não por request — 60s evita martelar a API
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`API respondeu ${response.status}`);
  }

  const payload = (await response.json()) as { products: ApiProduct[] };
  return (payload.products || []).map(toProduct);
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
