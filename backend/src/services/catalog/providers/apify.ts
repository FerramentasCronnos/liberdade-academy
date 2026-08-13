import { INTERNAL_CATEGORIES, type InternalCategory } from '../normalize.js';
import { CatalogConfigError, type CatalogProvider, type FetchOptions, type RawCatalogProduct, type Region } from '../types.js';

/**
 * Apify — marketplace de scrapers de TikTok Shop.
 *
 * Actor testado e recomendado: unseenuser/TikTok-Shop-Scraper
 *   - cobre BR e US (16 regiões)
 *   - US$ 0,0045 por produto (~US$ 4,50 / mil)
 *   - modo shop_search com busca por palavra-chave funcionando no Brasil
 *
 * Outros actors têm input diferente — use APIFY_INPUT_JSON pra substituir o
 * payload inteiro sem mexer no código.
 *
 * Cuidado com dois actors populares:
 *   - pro100chok/tiktok-shop-scraper → region aceita só "us"
 *   - herus13/tiktok-shop-scraper    → busca por palavra só nos EUA; fora dos
 *     EUA exige URL de produto + proxy residencial na região
 */

const APIFY_BASE_URL = 'https://api.apify.com/v2';

/**
 * O TikTok Shop não expõe "mais vendidos" por categoria numa URL estável, então
 * a descoberta é por palavra-chave. Cada termo vira uma busca, e o produto herda
 * a categoria do termo que o encontrou (o actor devolve sourceQuery).
 */
const DEFAULT_SEARCH_TERMS: Record<Region, Partial<Record<InternalCategory, string[]>>> = {
  BR: {
    beleza: ['kit skincare', 'maquiagem', 'perfume feminino'],
    saude: ['suplemento', 'colágeno'],
    fitness: ['whey protein', 'roupa academia'],
    moda: ['tênis', 'bolsa feminina'],
    casa: ['organizador cozinha', 'luminária led'],
    tech: ['fone bluetooth', 'carregador'],
    fisico: ['produtos virais'],
  },
  US: {
    beleza: ['skincare set', 'makeup', 'hair serum'],
    saude: ['supplements', 'collagen'],
    fitness: ['whey protein', 'gym outfit'],
    moda: ['sneakers', 'handbag'],
    casa: ['kitchen organizer', 'led lights'],
    tech: ['wireless earbuds', 'phone charger'],
    fisico: ['viral products'],
  },
};

function searchTermsFor(region: Region, category?: string): Map<string, InternalCategory> {
  let table = DEFAULT_SEARCH_TERMS[region];

  const override = process.env.APIFY_SEARCH_TERMS;
  if (override) {
    try {
      const parsed = JSON.parse(override) as Record<string, Record<string, string[]>>;
      if (parsed[region]) table = parsed[region] as Partial<Record<InternalCategory, string[]>>;
    } catch {
      throw new CatalogConfigError('APIFY_SEARCH_TERMS no es un JSON válido.');
    }
  }

  const wanted = category && INTERNAL_CATEGORIES.includes(category as InternalCategory)
    ? [category as InternalCategory]
    : (Object.keys(table) as InternalCategory[]);

  const map = new Map<string, InternalCategory>();
  for (const internal of wanted) {
    for (const term of table[internal] || []) map.set(term, internal);
  }
  return map;
}

function actorFor(region: Region): string | undefined {
  return (
    process.env[`APIFY_ACTOR_ID_${region}`] ||
    process.env.APIFY_TIKTOK_ACTOR_ID ||
    process.env.APIFY_ACTOR_ID ||
    undefined
  );
}

/** Aceita "usuario/actor" (formato da URL) e converte pro "usuario~actor" da API. */
function normalizeActorId(actorId: string) {
  return actorId.trim().replace('/', '~');
}

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

function pickString(item: Record<string, unknown>, keys: string[]): string | undefined {
  const value = pick(item, keys);
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : String(value);
}

function pickNumber(item: Record<string, unknown>, keys: string[]): number | undefined {
  const value = pick(item, keys);
  if (value === undefined) return undefined;
  const parsed =
    typeof value === 'string'
      ? Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'))
      : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstImage(item: Record<string, unknown>): string | undefined {
  const direct = pickString(item, [
    'primaryImage',
    'image',
    'imageUrl',
    'thumbnail',
    'cover',
    'coverUrl',
    'mainImage',
  ]);
  if (direct) return direct;

  const images = pick(item, ['images', 'imageUrls', 'photos']);
  if (Array.isArray(images) && images.length) {
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      const nested = first as Record<string, unknown>;
      const url = nested.url ?? nested.urlList ?? nested.src;
      if (typeof url === 'string') return url;
      if (Array.isArray(url) && typeof url[0] === 'string') return url[0];
    }
  }
  return undefined;
}

function mapItem(
  item: Record<string, unknown>,
  termToCategory: Map<string, InternalCategory>,
  priceDivisor: number,
): RawCatalogProduct | null {
  const externalId = pickString(item, ['productId', 'product_id', 'id', 'itemId', 'skuId']);
  const name = pickString(item, ['title', 'name', 'productName', 'product_name']);
  if (!externalId || !name) return null;

  const rawPrice = pickNumber(item, [
    'price',
    'currentPrice',
    'salePrice',
    'price.current',
    'priceValue',
    'min_price',
  ]);

  // Vários actors não devolvem categoria. Quando o item veio de uma busca
  // nossa, o termo diz a categoria melhor do que qualquer palpite.
  const sourceQuery = pickString(item, ['sourceQuery', 'source_query', 'searchQuery', 'keyword']);
  const categoryFromTerm = sourceQuery ? termToCategory.get(sourceQuery) : undefined;

  return {
    externalId,
    name,
    image: firstImage(item),
    productUrl: pickString(item, ['productUrl', 'url', 'link', 'detailUrl']),
    price: rawPrice === undefined ? undefined : rawPrice / priceDivisor,
    currency: pickString(item, ['currency', 'currencyCode', 'price.currency']),
    category:
      categoryFromTerm ||
      pickString(item, ['category', 'categoryName', 'mainCategory', 'category.name', 'categoryPath']),
    supplier: pickString(item, ['shopName', 'sellerName', 'seller.name', 'shop.name', 'store', 'storeName']),
    rating: pickNumber(item, ['rating', 'ratingValue', 'stars', 'reviewRating']),
    salesCount: pickNumber(item, ['soldCount', 'sales', 'salesCount', 'unitsSold', 'sold', 'sales30d']),
    tiktokViews: pickNumber(item, ['views', 'videoViews', 'tiktokViews', 'viewCount']),
    commission: pickNumber(item, ['commission', 'commissionRate', 'commission_rate']),
    description: pickString(item, ['description', 'desc', 'productDescription']),
  };
}

export const apifyProvider: CatalogProvider = {
  name: 'apify',
  supportedRegions: ['BR', 'US'],

  isConfigured() {
    return Boolean(process.env.APIFY_TOKEN);
  },

  missingConfigMessage() {
    if (!process.env.APIFY_TOKEN) {
      return 'APIFY_TOKEN no está configurado. Crea la cuenta en apify.com y genera el token en Settings → API & Integrations.';
    }
    return 'Defina APIFY_ACTOR_ID (ou APIFY_ACTOR_ID_BR / APIFY_ACTOR_ID_US) com o actor de TikTok Shop escolhido.';
  },

  async fetchTopProducts({ region, limit, category, terms: explicit }: FetchOptions): Promise<RawCatalogProduct[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new CatalogConfigError(this.missingConfigMessage());

    const actorId = actorFor(region);
    if (!actorId) {
      throw new CatalogConfigError(
        `Nenhum actor Apify definido para a região ${region}. Configure APIFY_ACTOR_ID_${region} ou APIFY_ACTOR_ID.`,
      );
    }

    // O unseenuser devolve BR em CENTAVOS (3149 = R$ 31,49) e US em DÓLARES
    // (26.99 = US$ 26,99) — e o priceDisplay dele formata o BR errado. Como a
    // unidade muda por região, o divisor é por região.
    const priceDivisor =
      Number(process.env[`APIFY_PRICE_DIVISOR_${region}`] || process.env.APIFY_PRICE_DIVISOR || 1) || 1;

    const termToCategory = searchTermsFor(region, category);

    // termos explícitos vencem o mapa padrão; herdam a categoria pedida
    if (explicit?.length) {
      termToCategory.clear();
      for (const term of explicit) {
        termToCategory.set(term, (category as InternalCategory) ?? 'fisico');
      }
    }

    const terms = [...termToCategory.keys()];
    const perTerm = Math.max(1, Math.ceil(limit / Math.max(1, terms.length)));

    // Payload do actor recomendado. APIFY_INPUT_JSON substitui por completo
    // (actors diferentes usam nomes de campo diferentes e costumam rejeitar
    // propriedades desconhecidas).
    let input: Record<string, unknown> = {
      mode: 'shop_search',
      region,
      searchKeywords: terms,
      maxResults: perTerm,
    };

    const template = process.env.APIFY_INPUT_JSON;
    if (template) {
      try {
        input = JSON.parse(
          template
            .replaceAll('{{region}}', region)
            .replaceAll('{{limit}}', String(perTerm))
            .replaceAll('{{keywords}}', JSON.stringify(terms))
            .replaceAll('{{category}}', category || ''),
        );
      } catch {
        throw new CatalogConfigError('APIFY_INPUT_JSON no es un JSON válido.');
      }
    }

    const url = `${APIFY_BASE_URL}/acts/${normalizeActorId(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&clean=true&limit=${limit}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Apify respondeu ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as unknown;
    const items = Array.isArray(payload) ? payload : [];

    return items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => mapItem(item, termToCategory, priceDivisor))
      .filter((item): item is RawCatalogProduct => item !== null);
  },
};
