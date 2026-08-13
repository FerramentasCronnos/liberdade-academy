import { CURRENCY_BY_REGION, type RawCatalogProduct, type Region } from './types';

/** Categorias internas do app — precisam bater com /categories e os chips do catálogo. */
export const INTERNAL_CATEGORIES = [
  'beleza',
  'saude',
  'fisico',
  'digital',
  'moda',
  'casa',
  'tech',
  'fitness',
] as const;

export type InternalCategory = (typeof INTERNAL_CATEGORIES)[number];

/**
 * Providers devolvem categoria em formatos bem diferentes ("Beauty & Personal
 * Care", "beauty", "Saúde"). Em vez de um mapa exato por provider, casamos por
 * palavra-chave — erra menos quando a API muda o rótulo.
 */
const CATEGORY_KEYWORDS: Array<[InternalCategory, string[]]> = [
  ['beleza', ['beauty', 'personal care', 'makeup', 'skincare', 'cosmet', 'beleza', 'maquiagem', 'perfum']],
  ['saude', ['health', 'wellness', 'supplement', 'vitamin', 'saude', 'saúde', 'suplement']],
  ['fitness', ['fitness', 'sport', 'gym', 'exercise', 'academia', 'esporte']],
  ['moda', ['fashion', 'apparel', 'clothing', 'shoes', 'jewel', 'bag', 'moda', 'roupa', 'calcado', 'calçado']],
  ['casa', ['home', 'kitchen', 'furniture', 'garden', 'decor', 'casa', 'cozinha', 'movel', 'móvel']],
  ['tech', ['tech', 'electronic', 'phone', 'computer', 'gadget', 'audio', 'camera', 'eletronic', 'eletrônic', 'celular']],
  ['digital', ['digital', 'ebook', 'course', 'software', 'curso']],
  ['fisico', ['physical', 'fisico', 'físico']],
];

export function mapCategory(raw?: string): InternalCategory {
  if (!raw) return 'fisico';
  const value = raw.toLowerCase();

  for (const [internal, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => value.includes(keyword))) return internal;
  }
  return 'fisico';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Limiar de "viral" — em BR o volume do TikTok Shop é bem menor que nos EUA. */
const VIRAL_VIEWS_THRESHOLD: Record<Region, number> = {
  BR: 300_000,
  US: 1_000_000,
};

const VIRAL_SALES_THRESHOLD: Record<Region, number> = {
  BR: 1_000,
  US: 5_000,
};

export interface NormalizedProduct {
  externalId: string;
  provider: string;
  region: Region;
  currency: string;
  productUrl: string | null;
  name: string;
  image: string;
  price: number;
  category: string;
  supplier: string;
  rating: number;
  salesCount: number;
  tiktokViews: number | null;
  isViral: boolean;
  /** null = provider não informou. Não inventamos percentual. */
  commission: number | null;
  description: string;
  supplierShips: boolean;
}

/**
 * Converte o produto cru do provider no formato do banco.
 *
 * Devolve null quando falta o mínimo — id, nome ou IMAGEM. Produto sem foto
 * não entra no catálogo: melhor a vitrine ter menos itens do que ter card
 * vazio ou com imagem genérica de banco de imagens.
 */
export function normalizeProduct(
  raw: RawCatalogProduct,
  provider: string,
  region: Region,
): NormalizedProduct | null {
  const externalId = String(raw.externalId || '').trim();
  const name = String(raw.name || '').trim();
  if (!externalId || !name) return null;

  const image = raw.image?.trim();
  if (!image || !/^https?:\/\//i.test(image)) return null;

  const salesCount = Math.max(0, Math.round(toNumber(raw.salesCount)));
  const tiktokViews = raw.tiktokViews == null ? null : Math.max(0, Math.round(toNumber(raw.tiktokViews)));

  const isViral =
    (tiktokViews != null && tiktokViews >= VIRAL_VIEWS_THRESHOLD[region]) ||
    salesCount >= VIRAL_SALES_THRESHOLD[region];

  return {
    externalId,
    provider,
    region,
    currency: raw.currency || CURRENCY_BY_REGION[region],
    productUrl: raw.productUrl?.trim() || null,
    name: name.slice(0, 300),
    image,
    price: Math.max(0, toNumber(raw.price)),
    category: mapCategory(raw.category),
    supplier: (raw.supplier || 'TikTok Shop').slice(0, 200),
    rating: clamp(toNumber(raw.rating, 4.5), 0, 5),
    salesCount,
    tiktokViews,
    isViral,
    commission:
      raw.commission == null ? null : Math.round(clamp(toNumber(raw.commission), 0, 100)),
    description: (raw.description || name).slice(0, 2000),
    supplierShips: raw.supplierShips ?? true,
  };
}
