import { prisma } from '@/lib/db';
import { normalizeProduct } from './normalize';
import { apifyProvider } from './providers/apify';
import { apifyAmazonProvider } from './providers/apify-amazon';
import { apifyShopeeProvider } from './providers/apify-shopee';
import { kalodataProvider } from './providers/kalodata';
import { seedProvider } from './providers/seed';
import {
  CatalogConfigError,
  isRegion,
  REGIONS,
  type CatalogProvider,
  type Region,
} from './types';

export { CatalogConfigError, REGIONS, isRegion };
export type { Region };

/**
 * Registry de providers. Para plugar um novo fornecedor:
 *   1. crie ./providers/<nome>.ts implementando CatalogProvider
 *   2. registre aqui
 *   3. use CATALOG_PROVIDER=<nome>
 *
 * TikTok Shop vem da Kalodata (CATALOG_PROVIDER=kalodata); o adapter Apify
 * continua disponível como alternativa. Ver docs/INTEGRATIONS.md.
 */
const PROVIDERS: Record<string, CatalogProvider> = {
  [seedProvider.name]: seedProvider,
  [apifyProvider.name]: apifyProvider,
  [kalodataProvider.name]: kalodataProvider,
  [apifyAmazonProvider.name]: apifyAmazonProvider,
  [apifyShopeeProvider.name]: apifyShopeeProvider,
};

/** Provider padrão de cada loja. TikTok segue CATALOG_PROVIDER. */
export function providerForMarketplace(marketplace?: string): CatalogProvider {
  if (marketplace === 'amazon') return apifyAmazonProvider;
  if (marketplace === 'shopee') return apifyShopeeProvider;
  return getProvider();
}

export const AVAILABLE_PROVIDERS = Object.keys(PROVIDERS);

export function getProvider(name?: string): CatalogProvider {
  const key = (name || process.env.CATALOG_PROVIDER || 'seed').trim().toLowerCase();
  const provider = PROVIDERS[key];

  if (!provider) {
    throw new CatalogConfigError(
      `Provider "${key}" não existe. Disponíveis: ${AVAILABLE_PROVIDERS.join(', ')}.`,
    );
  }
  return provider;
}

/** Regiões que o sync percorre quando nenhuma é informada. */
export function configuredRegions(): Region[] {
  const raw = process.env.CATALOG_REGIONS;
  if (!raw) return ['BR'];

  const parsed = raw
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(isRegion);

  return parsed.length ? parsed : ['BR'];
}

export interface SyncOptions {
  provider?: string;
  /** tiktok_shop (padrão) | amazon | shopee — escolhe o provider da loja. */
  marketplace?: string;
  regions?: Region[];
  limit?: number;
  category?: string;
  /** Termos de busca específicos, no lugar do mapa padrão da categoria. */
  terms?: string[];
  /** Máximo de produtos novos nesta execução (padrão: CATALOG_NEW_PER_RUN). */
  maxNew?: number;
  /**
   * Grava produtos novos como inativos (fora da vitrine). Serve pra testar um
   * provider novo num preview sem mudar o catálogo de produção, que usa o
   * mesmo banco. Rodar o sync depois sem `draft` ativa tudo.
   */
  draft?: boolean;
}

export interface SyncRegionResult {
  region: Region;
  fetched: number;
  saved: number;
  /** Quantos dos salvos ainda não existiam no catálogo. */
  created: number;
  skipped: number;
  /** Produtos que tiveram os vídeos de referência renovados nesta execução. */
  videos: number;
  error?: string;
}

export interface SyncResult {
  provider: string;
  results: SyncRegionResult[];
  synced: number;
  created: number;
  message: string;
}

/** Vídeos de referência valem por uma semana; depois são renovados no sync. */
const VIDEOS_REFRESH_MS = Number(process.env.CATALOG_VIDEOS_REFRESH_DAYS || 7) * 24 * 60 * 60 * 1000;

/**
 * Orçamento de tempo da execução. A rota tem maxDuration de 300 s e a API da
 * Kalodata aceita ~1 chamada por segundo, então o sync precisa parar antes do
 * limite e deixar o que faltou (vídeos, produtos novos) pro dia seguinte.
 */
const FETCH_BUDGET_MS = Number(process.env.CATALOG_FETCH_BUDGET_MS || 150_000);
const TOTAL_BUDGET_MS = Number(process.env.CATALOG_SYNC_BUDGET_MS || 250_000);
const VIDEOS_PER_RUN = Number(process.env.CATALOG_VIDEOS_PER_RUN || 80);
/** Produtos novos por execução (controle de gasto na Kalodata); 0 = sem limite. */
const NEW_PER_RUN = Number(process.env.CATALOG_NEW_PER_RUN || 0);

/** Ponto diário do histórico de receita gravado no produto. */
export type TrendPoint = { d: string; r: number };

/**
 * Acrescenta a receita de hoje ao histórico (um ponto por dia, até 60). A API
 * não devolve a série; o gráfico de tendência nasce desses pontos acumulados
 * pelo cron diário.
 */
function appendTrend(current: unknown, revenue: number | null, now: Date): TrendPoint[] {
  const points = Array.isArray(current)
    ? (current as unknown[]).filter((p): p is TrendPoint => typeof p === 'object' && p !== null && 'd' in p && 'r' in p)
    : [];
  if (revenue == null) return points;
  const day = now.toISOString().slice(0, 10);
  const without = points.filter((p) => p.d !== day);
  return [...without, { d: day, r: revenue }].slice(-60);
}

/**
 * Troca os vídeos de referência do produto pelos atuais. Falha de um produto
 * não interrompe o sync: fica no log e tenta de novo no dia seguinte.
 */
async function refreshVideos(provider: CatalogProvider, productId: string, externalId: string, region: Region) {
  if (!provider.fetchReferenceVideos) return false;
  try {
    const videos = await provider.fetchReferenceVideos(externalId, region);
    const now = new Date();
    await prisma.$transaction([
      prisma.productVideo.deleteMany({ where: { productId } }),
      ...(videos.length
        ? [
            prisma.productVideo.createMany({
              data: videos.slice(0, 5).map((video) => ({
                productId,
                videoId: video.videoId,
                title: (video.title || '').slice(0, 500),
                url: video.url,
                creatorHandle: video.creatorHandle.slice(0, 100),
                creatorId: video.creatorId,
                thumbnail: video.thumbnail,
                views: Math.max(0, Math.round(video.views ?? 0)),
                revenue: Math.max(0, video.revenue ?? 0),
                likes: Math.max(0, Math.round(video.likes ?? 0)),
                comments: Math.max(0, Math.round(video.comments ?? 0)),
                shares: Math.max(0, Math.round(video.shares ?? 0)),
                isAd: Boolean(video.isAd),
                publishedAt: video.publishedAt,
                syncedAt: now,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      prisma.product.update({ where: { id: productId }, data: { videosSyncedAt: now } }),
    ]);
    return true;
  } catch (error) {
    console.error('[catalog] vídeos não renovados', externalId, error);
    return false;
  }
}

/**
 * Busca no provider e grava no Postgres.
 *
 * Uma região que falha não derruba as outras — o erro fica registrado no
 * resultado daquela região. Assim um actor US quebrado não impede o BR.
 */
export async function syncCatalog(options: SyncOptions = {}): Promise<SyncResult> {
  const provider = options.marketplace ? providerForMarketplace(options.marketplace) : getProvider(options.provider);
  const limit = Math.min(Math.max(options.limit ?? Number(process.env.CATALOG_SYNC_LIMIT || 100), 1), 1000);

  if (provider.name === 'seed') {
    const total = await prisma.product.count({ where: { active: true } });
    return {
      provider: provider.name,
      results: [],
      synced: 0,
      created: 0,
      message: `CATALOG_PROVIDER=seed — catálogo servido do Postgres (${total} produtos). Configure um provider para buscar dados reais do TikTok Shop.`,
    };
  }

  if (!provider.isConfigured()) {
    throw new CatalogConfigError(provider.missingConfigMessage());
  }

  const regions = (options.regions?.length ? options.regions : configuredRegions()).filter((region) =>
    provider.supportedRegions.includes(region),
  );

  if (!regions.length) {
    throw new CatalogConfigError(
      `Provider "${provider.name}" não atende as regiões pedidas. Suporta: ${provider.supportedRegions.join(', ')}.`,
    );
  }

  const results: SyncRegionResult[] = [];
  const started = Date.now();

  for (const region of regions) {
    try {
      // o que já existe com foto: o provider pula o detalhe caro desses
      const existingRows = await prisma.product.findMany({
        where: { provider: provider.name, region, image: { startsWith: 'http' } },
        select: {
          id: true,
          externalId: true,
          image: true,
          images: true,
          price: true,
          description: true,
          category: true,
          productUrl: true,
          reviewCount: true,
          creatorCount: true,
          videoCount: true,
          videosSyncedAt: true,
        },
      });
      const existing = new Map(existingRows.map((row) => [row.externalId ?? '', row]));
      // só é "conhecido" quem já tem galeria: produto gravado antes das fotos extras volta ao detalhe uma vez
      const knownIds = new Set(existingRows.filter((row) => row.images.length > 0).map((row) => row.externalId ?? ''));

      const raw = await provider.fetchTopProducts({
        region,
        limit,
        category: options.category,
        terms: options.terms,
        knownIds,
        deadline: started + FETCH_BUDGET_MS,
        maxNew: options.maxNew ?? (NEW_PER_RUN > 0 ? NEW_PER_RUN : undefined),
      });
      const normalized = raw
        .map((item) => {
          const known = existing.get(item.externalId);
          if (!known || item.image) return item;
          // produto conhecido: provider mandou só o que muda; completa com o banco
          return {
            ...item,
            image: known.image,
            images: known.images,
            price: known.price,
            description: item.description ?? known.description,
            category: item.category ?? known.category,
            productUrl: item.productUrl ?? known.productUrl ?? undefined,
            reviewCount: item.reviewCount ?? known.reviewCount ?? undefined,
            creatorCount: item.creatorCount ?? known.creatorCount ?? undefined,
            videoCount: item.videoCount ?? known.videoCount ?? undefined,
          };
        })
        .map((item) => normalizeProduct(item, provider.name, region, provider.marketplace))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      let saved = 0;
      let created = 0;
      let videos = 0;
      const now = new Date();
      for (const product of normalized) {
        const { externalId, ...data } = product;
        const where = { provider_region_externalId: { provider: provider.name, region, externalId } };
        const exists = await prisma.product.findUnique({
          where,
          select: { id: true, videosSyncedAt: true, revenueTrend: true },
        });
        const revenueTrend = appendTrend(exists?.revenueTrend, data.revenue, now);
        const row = await prisma.product.upsert({
          where,
          update: { ...data, externalId, revenueTrend, syncedAt: now, ...(options.draft ? {} : { active: true }) },
          create: { ...data, externalId, revenueTrend, syncedAt: now, active: !options.draft },
          select: { id: true },
        });
        saved += 1;
        if (!exists) created += 1;

        const lastVideos = exists?.videosSyncedAt?.getTime() ?? 0;
        const hasTime = Date.now() - started < TOTAL_BUDGET_MS && videos < VIDEOS_PER_RUN;
        if (provider.fetchReferenceVideos && hasTime && now.getTime() - lastVideos > VIDEOS_REFRESH_MS) {
          if (await refreshVideos(provider, row.id, externalId, region)) videos += 1;
        }
      }

      results.push({
        region,
        fetched: raw.length,
        saved,
        created,
        skipped: raw.length - normalized.length,
        videos,
      });
    } catch (error) {
      results.push({
        region,
        fetched: 0,
        saved: 0,
        created: 0,
        skipped: 0,
        videos: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const synced = results.reduce((total, result) => total + result.saved, 0);
  const created = results.reduce((total, result) => total + result.created, 0);
  const videos = results.reduce((total, result) => total + result.videos, 0);
  const failed = results.filter((result) => result.error);

  return {
    provider: provider.name,
    results,
    synced,
    created,
    message: failed.length
      ? `${synced} produtos sincronizados (${created} novos). Falhou em: ${failed.map((f) => f.region).join(', ')}.`
      : `${synced} produtos sincronizados de ${provider.name} (${created} novos, vídeos renovados em ${videos}).`,
  };
}
