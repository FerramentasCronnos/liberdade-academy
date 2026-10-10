import { put } from '@vercel/blob';
import { INTERNAL_CATEGORIES, type InternalCategory } from '../normalize';
import {
  CatalogConfigError,
  type CatalogProvider,
  type FetchOptions,
  type RawCatalogProduct,
  type RawReferenceVideo,
  type Region,
} from '../types';

/**
 * Kalodata Open API — analytics oficial de TikTok Shop (produtos, vídeos,
 * criadores). Documentação: https://www.kalodata.com/open-center/docs
 *
 * Como funciona:
 *   - autenticação pelo header `secret-key` (env KALODATA_API_KEY)
 *   - tudo é POST JSON em https://www.kalodata.com/openapi/v1/tiktok/<recurso>
 *   - cada chamada consome ~0,1 ponto da conta; por isso o sync só busca o
 *     detalhe (imagem, descrição) de produto que ainda não está no banco e
 *     renova os vídeos de referência uma vez por semana (ver index.ts)
 *
 * Limitações observadas na API (10/2026):
 *   - `master_image_url` vem sempre null no rank e no detalhe. A imagem sai do
 *     primeiro bloco de imagem da descrição do produto; produto sem nenhuma
 *     imagem é descartado (o normalizador exige foto).
 *   - o rank não traz categoria; por isso buscamos o rank por categoria do
 *     TikTok (`category_ids`, lista — `category_id` é ignorado em silêncio) e o
 *     produto herda a categoria interna da busca. O rank geral usa
 *     `pri_cate_id` do detalhe para classificar.
 *   - os vídeos não vêm com URL nem thumbnail: a URL é montada com o handle do
 *     criador e o id do vídeo (formato público do TikTok).
 */

const BASE_URL = 'https://www.kalodata.com/openapi/v1/tiktok';
const LANGUAGE = 'es-ES';
const PAGE_SIZE = 50;
const USER_AGENT = 'MVA-catalog/1.0';

/** Período do ranking. last30Day equilibra "está vendendo agora" com volume. */
function dateRange() {
  return process.env.KALODATA_DATE_RANGE || 'last30Day';
}

/**
 * Categorias primárias do TikTok Shop (ids da Kalodata, iguais em qualquer
 * idioma) agrupadas na categoria interna do app. Cada grupo vira uma consulta
 * ao rank, pra o catálogo não ficar só com beleza (que domina o faturamento).
 */
const CATEGORY_IDS: Record<InternalCategory, string[]> = {
  beleza: ['601450'], // Belleza y cuidado personal
  saude: ['700645'], // Salud (inclui suplementos)
  fitness: ['603014'], // Deportes y actividades al aire libre
  moda: ['601152', '824328', '605248', '601352'], // ropa mujer/hombre, accesorios, zapatos
  casa: ['600001', '604453', '600942'], // hogar, muebles, electrodomésticos
  tech: ['601739'], // teléfonos y electrónica
  digital: [],
  fisico: [],
};

/** Categoria primária → interna, para produtos do ranking geral. */
const CATEGORY_BY_ID: Record<string, InternalCategory> = {
  ...Object.fromEntries(
    (Object.entries(CATEGORY_IDS) as Array<[InternalCategory, string[]]>).flatMap(([internal, ids]) =>
      ids.map((id) => [id, internal] as const),
    ),
  ),
  '700646': 'saude', // suplementos alimenticios
  '700650': 'saude', // suplementos de bienestar
  '600154': 'casa', // textiles para el hogar
  '600024': 'casa', // menaje de cocina
  '604968': 'casa', // mejoras en el hogar
  '604579': 'casa', // herramientas
  '601755': 'tech', // ordenadores y oficina
  '824584': 'moda', // equipaje y bolsos
};

/* ------------------------------------------------------------------ tipos */

interface RankProduct {
  product_id: string;
  product_name: string;
  revenue: number;
  commission_rate: number | null;
  sales_volumn: number;
  unit_price: number;
  revenue_growth_rate?: number | null;
  live_revenue?: number | null;
  video_revenue?: number | null;
  showcase_revenue?: number | null;
  launch_date?: string;
  master_image_url?: string | null;
  seller_id?: string;
  seller_name?: string;
}

interface DescriptionBlock {
  type: 'text' | 'image';
  text?: string;
  image?: { url_list?: string[] };
}

interface ProductDetail {
  product_id: string;
  product_name: string;
  pri_cate_id?: string;
  min_price?: number;
  max_price?: number;
  unit_price?: number;
  commission_rate?: number | null;
  sales_volumn?: number;
  revenue?: number;
  video_revenue?: number;
  live_revenue?: number;
  creator_number?: number;
  video_number?: number;
  live_number?: number;
  product_review_count?: number;
  launch_date?: string;
  master_image_url?: string | null;
  product_description?: DescriptionBlock[];
}

interface RankVideo {
  video_id: string;
  video_title?: string;
  belonged_creator_id?: string;
  belonged_creator_handle?: string;
  revenue?: number;
  views?: number;
  digg_count?: number;
  share_count?: number;
  comment_count?: number;
  ad?: number;
  publish_date?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  code?: string | null;
}

class KalodataError extends Error {
  constructor(message: string, readonly notFound = false) {
    super(message);
    this.name = 'KalodataError';
  }
}

/* --------------------------------------------------------------- chamadas */

function apiKey() {
  const key = process.env.KALODATA_API_KEY;
  if (!key) throw new CatalogConfigError(kalodataProvider.missingConfigMessage());
  return key;
}

/**
 * A API tem controle de tráfego ("Try again later, exceeding traffic control")
 * e derruba rajadas. Todas as chamadas passam por uma fila única com intervalo
 * mínimo entre elas; quando mesmo assim o limite aparece, espera e tenta de novo.
 */
const MIN_GAP_MS = Number(process.env.KALODATA_MIN_GAP_MS || 750);
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await throttled(() => request<T>(path, body));
    } catch (error) {
      const throttledByApi = error instanceof KalodataError && /traffic control|try again later|too many/i.test(error.message);
      if (!throttledByApi || attempt >= 4) throw error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** (attempt - 1)));
    }
  }
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'secret-key': apiKey(),
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  let payload: ApiResponse<T> | null = null;
  try {
    payload = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new KalodataError(`Kalodata ${path} respondeu ${response.status}: ${text.slice(0, 200)}`);
  }

  if (!response.ok || !payload.success) {
    const message = payload.message || `HTTP ${response.status}`;
    throw new KalodataError(`Kalodata ${path}: ${message}`, /not found/i.test(message));
  }
  return payload.data as T;
}

function baseBody(region: Region) {
  return { region, language: LANGUAGE, currency: region === 'BR' ? 'BRL' : 'USD', date_range: dateRange() };
}

/** Uma página do ranking por receita (até PAGE_SIZE itens). */
async function fetchRankPage(
  region: Region,
  pageSize: number,
  page: number,
  range: string,
  categoryIds?: string[],
): Promise<RankProduct[]> {
  const data = await call<RankProduct[]>('product/rank', {
    ...baseBody(region),
    date_range: range,
    ...(categoryIds?.length ? { category_ids: categoryIds } : {}),
    is_affiliate: 1, // só produto com programa de afiliados
    sort_field: { field: 'revenue', type: 'DESC' },
    page_number: page,
    page_size: Math.min(PAGE_SIZE, Math.max(1, pageSize)),
  });
  return data ?? [];
}

async function fetchDetail(productId: string, region: Region): Promise<ProductDetail | null> {
  try {
    return await call<ProductDetail>('product/detail', { ...baseBody(region), product_id: productId });
  } catch (error) {
    if (error instanceof KalodataError && error.notFound) return null;
    throw error;
  }
}

async function fetchVideos(productId: string, region: Region, range: string): Promise<RankVideo[]> {
  try {
    const data = await call<RankVideo[]>('video/rank', {
      ...baseBody(region),
      date_range: range,
      product_id: productId,
      sort_field: { field: 'revenue', type: 'DESC' },
      page_number: 1,
      page_size: 5,
    });
    return data ?? [];
  } catch (error) {
    if (error instanceof KalodataError && error.notFound) return [];
    throw error;
  }
}

/* ------------------------------------------------------------- utilidades */

/** Imagens da descrição, sem a query string assinada (a URL base é estável). */
function imagesFromDetail(detail: ProductDetail): string[] {
  const urls: string[] = [];
  if (detail.master_image_url && /^https?:\/\//.test(detail.master_image_url)) urls.push(detail.master_image_url);
  for (const block of detail.product_description ?? []) {
    const url = block.type === 'image' ? block.image?.url_list?.[0] : undefined;
    if (url && /^https?:\/\//.test(url)) urls.push(url.split('?')[0]);
  }
  return Array.from(new Set(urls)).slice(0, 10);
}

function descriptionFromDetail(detail: ProductDetail): string | undefined {
  const texts = (detail.product_description ?? [])
    .filter((block) => block.type === 'text' && block.text?.trim())
    .map((block) => block.text!.trim());
  if (!texts.length) return undefined;
  let out = '';
  for (const text of texts) {
    if (out.length + text.length > 1200) break;
    out += (out ? ' ' : '') + text;
  }
  return out || undefined;
}

/**
 * Copia a imagem para o Vercel Blob. O CDN do TikTok pode trocar ou expirar a
 * URL; no Blob a foto do card fica garantida. Sem token (ou com falha) usa a
 * URL original mesmo.
 */
async function persistImage(url: string, productId: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return url;
    const type = response.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return url;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const blob = await put(`catalog/tiktok/${productId}.${ext}`, await response.blob(), {
      access: 'public',
      contentType: type,
      allowOverwrite: true,
    });
    return blob.url;
  } catch (error) {
    console.warn('[kalodata] imagem não copiada para o Blob', productId, error);
    return url;
  }
}

/** Link público do produto no TikTok Shop. */
function productUrl(productId: string, region: Region) {
  return `https://www.tiktok.com/view/product/${productId}?region=${region}`;
}

/** "2026/10/04 20:17:18" → Date (a API não informa fuso; tratamos como UTC). */
function parsePublishDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})[/-](\d{2})[/-](\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return undefined;
  const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
  const date = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Intercala as listas: 1º de cada categoria, depois 2º de cada... */
function roundRobin<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) if (list[i] !== undefined) out.push(list[i]);
  }
  return out;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

/* --------------------------------------------------------------- provider */

export const kalodataProvider: CatalogProvider = {
  name: 'kalodata',
  marketplace: 'tiktok_shop',
  supportedRegions: ['US', 'BR'],

  isConfigured() {
    return Boolean(process.env.KALODATA_API_KEY);
  },

  missingConfigMessage() {
    return 'KALODATA_API_KEY no está configurada (clave de la Open API de Kalodata, en Open Center).';
  },

  async fetchTopProducts({ region, limit, category, knownIds, deadline, maxNew }: FetchOptions): Promise<RawCatalogProduct[]> {
    apiKey();
    const known = knownIds ?? new Set<string>();
    const newBudget = maxNew ?? Number.POSITIVE_INFINITY;

    const wanted = (
      category && INTERNAL_CATEGORIES.includes(category as InternalCategory)
        ? [category as InternalCategory]
        : (Object.keys(CATEGORY_IDS) as InternalCategory[])
    ).filter((internal) => CATEGORY_IDS[internal].length);

    const queries: Array<{ internal?: InternalCategory; categoryIds?: string[] }> = wanted.map((internal) => ({
      internal,
      categoryIds: CATEGORY_IDS[internal],
    }));
    if (!category) queries.push({}); // ranking geral: pega campeões fora dos grupos

    const results: RawCatalogProduct[] = [];
    const seen = new Set<string>();
    let updated = 0; // conhecidos devolvidos (atualização diária), até `limit`
    let accepted = 0; // novos aceitos (com imagem), até `maxNew`
    const perPage = Math.min(PAGE_SIZE, Math.max(10, Math.ceil((limit * 1.8) / queries.length)));
    const BATCH = 6;
    const MAX_PAGES = 4;

    /**
     * Página a página: a 1ª traz o topo de cada categoria (30 dias) e também o
     * ranking dos últimos 7 dias, que revela o que está subindo agora. Quando o
     * topo já é todo conhecido, as páginas seguintes buscam novidade mais
     * abaixo — assim todo dia entram ofertas novas até fechar a cota.
     */
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      if (deadline && Date.now() > deadline) break;
      const lists = await mapConcurrent(queries, 2, async (query) => {
        const rows = await fetchRankPage(region, perPage, page, dateRange(), query.categoryIds);
        const rising = page === 1 ? await fetchRankPage(region, perPage, 1, 'last7Day', query.categoryIds) : [];
        return [...rows, ...rising].map((row) => ({ row, internal: query.internal }));
      });

      const candidates = roundRobin(lists).filter(({ row }) => {
        if (!row.product_id || seen.has(row.product_id)) return false;
        seen.add(row.product_id);
        // sem comissão não dá pra afiliar — não entra no catálogo
        return (row.commission_rate ?? 0) > 0;
      });
      if (!candidates.length) break;

      for (let start = 0; start < candidates.length; start += BATCH) {
        if (deadline && Date.now() > deadline) break;
        const batch = candidates
          .slice(start, start + BATCH)
          // conhecido além do limite diário ou novo além da cota: nem gasta chamada
          .filter(({ row }) => (known.has(row.product_id) ? updated < limit : accepted < newBudget));
        if (!batch.length) {
          if (updated >= limit && accepted >= newBudget) break;
          continue;
        }
        const mapped = await mapConcurrent(batch, BATCH, async ({ row, internal }): Promise<RawCatalogProduct | null> => {
          const base: RawCatalogProduct = {
            externalId: row.product_id,
            name: row.product_name,
            productUrl: productUrl(row.product_id, region),
            price: row.unit_price,
            category: internal,
            supplier: row.seller_name,
            rating: 0, // a API não tem avaliação; 0 esconde a estrela em vez de inventar
            salesCount: row.sales_volumn,
            commission: row.commission_rate ?? undefined,
            // métricas que mudam todo dia vêm do ranking, sem chamada extra
            revenue: row.revenue,
            revenueGrowth: row.revenue_growth_rate ?? undefined,
            unitPrice: row.unit_price,
            videoRevenue: row.video_revenue ?? undefined,
            liveRevenue: row.live_revenue ?? undefined,
            launchDate: parsePublishDate(row.launch_date),
          };
          if (known.has(row.product_id)) return base; // sync completa imagem/descrição do banco

          const detail = await fetchDetail(row.product_id, region);
          if (!detail) return null;
          const images = imagesFromDetail(detail);
          if (!images.length) return null;

          const minPrice = detail.min_price ?? 0;
          const unit = detail.unit_price ?? row.unit_price;
          const main = await persistImage(images[0], row.product_id);
          return {
            ...base,
            image: main,
            images: [main, ...images.slice(1)],
            price: minPrice > 0 && minPrice <= unit * 2 ? minPrice : unit,
            category: internal ?? (detail.pri_cate_id ? CATEGORY_BY_ID[detail.pri_cate_id] : undefined),
            description: descriptionFromDetail(detail),
            commission: detail.commission_rate ?? base.commission,
            reviewCount: detail.product_review_count,
            creatorCount: detail.creator_number,
            videoCount: detail.video_number,
          };
        });
        for (const item of mapped) {
          if (!item) continue;
          if (known.has(item.externalId)) {
            if (updated >= limit) continue;
            updated += 1;
          } else {
            if (accepted >= newBudget) continue;
            accepted += 1;
          }
          results.push(item);
        }
      }

      if (updated >= limit && accepted >= newBudget) break;
      // sem cota de novos (maxNew ausente) o objetivo é só o limite diário
      if (!Number.isFinite(newBudget) && results.length >= limit) break;
    }

    return results;
  },

  async fetchReferenceVideos(externalId: string, region: Region): Promise<RawReferenceVideo[]> {
    let rows = await fetchVideos(externalId, region, dateRange());
    // produto novo ou sazonal: amplia a janela pra conseguir pelo menos 3
    if (rows.length < 3) {
      const wider = await fetchVideos(externalId, region, 'last90Day');
      if (wider.length > rows.length) rows = wider;
    }

    return rows
      .filter((video) => video.video_id && video.belonged_creator_handle)
      .map((video) => ({
        videoId: video.video_id,
        title: video.video_title?.trim() || undefined,
        url: `https://www.tiktok.com/@${video.belonged_creator_handle}/video/${video.video_id}`,
        creatorHandle: video.belonged_creator_handle!,
        creatorId: video.belonged_creator_id,
        views: video.views,
        revenue: video.revenue,
        likes: video.digg_count,
        comments: video.comment_count,
        shares: video.share_count,
        isAd: video.ad === 1,
        publishedAt: parsePublishDate(video.publish_date),
      }));
  },
};
