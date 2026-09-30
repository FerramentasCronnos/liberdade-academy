import { INTERNAL_CATEGORIES, type InternalCategory } from '../normalize';
import { CatalogConfigError, type CatalogProvider, type FetchOptions, type RawCatalogProduct } from '../types';

/**
 * Shopee Brasil via Apify — actor zen-studio/shopee-product-scraper.
 *
 * Busca por palavra-chave em shopee.com.br e devolve nome, preço em BRL,
 * imagem, URL, vendidos e nota. US$ 4,99 por mil produtos. O actor mais
 * popular para o Brasil (paulovitor18) não devolve imagem, e produto sem
 * foto não entra no catálogo.
 */
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const DEFAULT_ACTOR = 'zen-studio/shopee-product-scraper';

const DEFAULT_TERMS: Partial<Record<InternalCategory, string[]>> = {
  beleza: ['skincare viral', 'maquiagem'],
  saude: ['suplemento', 'colágeno'],
  fitness: ['acessórios treino', 'whey protein'],
  moda: ['moda feminina tendência', 'tênis'],
  casa: ['utensílios cozinha', 'organizador casa'],
  tech: ['fone bluetooth', 'acessórios celular'],
};

function pick(item: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = item[key];
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

export const apifyShopeeProvider: CatalogProvider = {
  name: 'apify_shopee',
  marketplace: 'shopee',
  supportedRegions: ['BR'],

  isConfigured() {
    return Boolean(process.env.APIFY_TOKEN);
  },

  missingConfigMessage() {
    return 'APIFY_TOKEN no está configurado.';
  },

  async fetchTopProducts({ limit, category, terms: explicit }: FetchOptions): Promise<RawCatalogProduct[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new CatalogConfigError(this.missingConfigMessage());

    const actorId = (process.env.APIFY_SHOPEE_ACTOR_ID || DEFAULT_ACTOR).trim().replace('/', '~');

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

    const input = {
      searchTerms: terms,
      region: 'BR',
      maxItems: limit,
      sort: 'sales',
      includeEnrichment: false,
    };

    const url = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&clean=true&limit=${limit}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Apify (Shopee) respondeu ${response.status}: ${body.slice(0, 300)}`);
    }

    const items = (await response.json()) as unknown;
    return (Array.isArray(items) ? items : [])
      .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
      .map((item): RawCatalogProduct | null => {
        const externalId = str(item, ['itemId', 'itemid', 'item_id', 'id']);
        const name = str(item, ['name', 'nome', 'title']);
        if (!externalId || !name) return null;

        const source = str(item, ['searchTerm', 'keyword', 'query']) ?? '';
        const fromTerm = termToCategory.get(source) ?? (terms.length === 1 ? termToCategory.get(terms[0]) : undefined);
        const shopId = str(item, ['shopId', 'shopid', 'shop_id']);

        return {
          externalId,
          name,
          image: str(item, ['image', 'imageUrl', 'imagem', 'thumbnail']),
          productUrl: str(item, ['url', 'link']) ?? (shopId ? `https://shopee.com.br/product/${shopId}/${externalId}` : undefined),
          price: num(item, ['price', 'preco']),
          currency: 'BRL',
          category: fromTerm ?? str(item, ['category', 'categoria']),
          supplier: str(item, ['shopName', 'loja_nome', 'shop_name']) ?? 'Shopee',
          rating: num(item, ['rating', 'nota']),
          salesCount: num(item, ['sold', 'vendidos', 'historicalSold']),
          description: str(item, ['description', 'descricao']),
        };
      })
      .filter((i): i is RawCatalogProduct => i !== null);
  },
};
