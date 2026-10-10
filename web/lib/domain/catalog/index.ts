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

  for (const region of regions) {
    try {
      // o que já existe com foto: o provider pula o detalhe caro desses
      const existingRows = await prisma.product.findMany({
        where: { provider: provider.name, region, image: { startsWith: 'http' } },
        select: {
          id: true,
          externalId: true,
          image: true,
          price: true,
          description: true,
          category: true,
          productUrl: true,
          videosSyncedAt: true,
        },
      });
      const existing = new Map(existingRows.map((row) => [row.externalId ?? '', row]));

      const raw = await provider.fetchTopProducts({
        region,
        limit,
        category: options.category,
        terms: options.terms,
        knownIds: new Set(existing.keys()),
      });
      const normalized = raw
        .map((item) => {
          const known = existing.get(item.externalId);
          if (!known || item.image) return item;
          // produto conhecido: provider mandou só o que muda; completa com o banco
          return {
            ...item,
            image: known.image,
            price: item.price && item.price > 0 ? item.price : known.price,
            description: item.description ?? known.description,
            category: item.category ?? known.category,
            productUrl: item.productUrl ?? known.productUrl ?? undefined,
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
        const exists = await prisma.product.findUnique({ where, select: { id: true, videosSyncedAt: true } });
        const row = await prisma.product.upsert({
          where,
          update: { ...data, externalId, syncedAt: now, ...(options.draft ? {} : { active: true }) },
          create: { ...data, externalId, syncedAt: now, active: !options.draft },
          select: { id: true },
        });
        saved += 1;
        if (!exists) created += 1;

        const lastVideos = exists?.videosSyncedAt?.getTime() ?? 0;
        if (provider.fetchReferenceVideos && now.getTime() - lastVideos > VIDEOS_REFRESH_MS) {
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
