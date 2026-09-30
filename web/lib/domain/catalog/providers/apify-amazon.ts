import { INTERNAL_CATEGORIES, type InternalCategory } from '../normalize';
import { CatalogConfigError, type CatalogProvider, type FetchOptions, type RawCatalogProduct } from '../types';

/**
 * Amazon (EUA) via Apify — actor junglee/amazon-crawler.
 *
 * Busca por palavra-chave em amazon.com/s?k=… e devolve título, ASIN, preço,
 * imagem, estrelas e avaliações. Sem detalhes de produto (scrapeProductDetails
 * false): mais barato e suficiente para a vitrine. US$ 3 por mil resultados.
 */
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const DEFAULT_ACTOR = 'junglee/amazon-crawler';

const DEFAULT_TERMS: Partial<Record<InternalCategory, string[]>> = {
  beleza: ['viral skincare', 'makeup best sellers'],
  saude: ['supplements best sellers', 'electrolytes'],
  fitness: ['home gym equipment', 'resistance bands'],
  moda: ['women fashion trending', 'sneakers'],
  casa: ['kitchen gadgets', 'home organization'],
  tech: ['tech gadgets', 'wireless earbuds'],
};

function pick(item: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>(
      (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
      item,
    );
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}
const str = (item: Record<string, unknown>, keys: string[]) => {
  const v = pick(item, keys);
  return v === undefined ? undefined : String(v);
};
const num = (item: Record<string, unknown>, keys: string[]) => {
  const v = pick(item, keys);
  if (v === undefined) return undefined;
  const n = typeof v === 'string' ? Number(v.replace(/[^0-9.,-]/g, '').replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const apifyAmazonProvider: CatalogProvider = {
  name: 'apify_amazon',
  marketplace: 'amazon',
  supportedRegions: ['US'],

  isConfigured() {
    return Boolean(process.env.APIFY_TOKEN);
  },

  missingConfigMessage() {
    return 'APIFY_TOKEN no está configurado.';
  },

  async fetchTopProducts({ limit, category, terms: explicit }: FetchOptions): Promise<RawCatalogProduct[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new CatalogConfigError(this.missingConfigMessage());

    const actorId = (process.env.APIFY_AMAZON_ACTOR_ID || DEFAULT_ACTOR).trim().replace('/', '~');

    // termo → categoria interna, como no provider do TikTok
    const termToCategory = new Map<string, InternalCategory>();
    if (explicit?.length) {
      for (const t of explicit) termToCategory.set(t, (category as InternalCategory) ?? 'fisico');
    } else {
      const wanted = category && INTERNAL_CATEGORIES.includes(category as InternalCategory)
        ? [category as InternalCategory]
        : (Object.keys(DEFAULT_TERMS) as InternalCategory[]);
      for (const c of wanted) for (const t of DEFAULT_TERMS[c] || []) termToCategory.set(t, c);
    }
    const terms = [...termToCategory.keys()];
    const perTerm = Math.max(1, Math.ceil(limit / Math.max(1, terms.length)));

    const input = {
      categoryOrProductUrls: terms.map((t) => ({ url: `https://www.amazon.com/s?k=${encodeURIComponent(t)}` })),
      maxItemsPerStartUrl: perTerm,
      maxSearchPagesPerStartUrl: 2,
      scrapeProductDetails: false,
      proxyCountry: 'AUTO_SELECT_PROXY_COUNTRY',
    };

    const url = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&clean=true&limit=${limit}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Apify (Amazon) respondeu ${response.status}: ${body.slice(0, 300)}`);
    }

    const items = (await response.json()) as unknown;
    return (Array.isArray(items) ? items : [])
      .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
      .map((item): RawCatalogProduct | null => {
        const externalId = str(item, ['asin', 'ASIN', 'id']);
        const name = str(item, ['title', 'name']);
        if (!externalId || !name) return null;

        // a URL de busca que originou o item diz a categoria
        const source = str(item, ['searchUrl', 'startUrl', 'inputUrl', 'url']) ?? '';
        const matched = terms.find((t) => source.includes(encodeURIComponent(t)));
        const fromTerm = matched ? termToCategory.get(matched) : undefined;

        return {
          externalId,
          name,
          image: str(item, ['thumbnailImage', 'image', 'imageUrl', 'mainImage']),
          productUrl: str(item, ['url', 'productUrl']) ?? `https://www.amazon.com/dp/${externalId}`,
          price: num(item, ['price.value', 'price', 'currentPrice']),
          currency: 'USD',
          category: fromTerm ?? (terms.length === 1 ? termToCategory.get(terms[0]) : undefined) ?? str(item, ['breadCrumbs', 'category']),
          supplier: str(item, ['brand', 'seller.name']) ?? 'Amazon',
          rating: num(item, ['stars', 'rating']),
          salesCount: num(item, ['boughtInPastMonth', 'reviewsCount']),
          description: str(item, ['description']) ?? (Array.isArray(item.features) ? (item.features as string[]).join(' ') : undefined),
        };
      })
      .filter((i): i is RawCatalogProduct => i !== null);
  },
};
