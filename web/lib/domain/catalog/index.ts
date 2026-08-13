import { prisma } from '@/lib/db';
import { normalizeProduct } from './normalize';
import { apifyProvider } from './providers/apify';
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
 * EchoTik e Scavio ainda não têm adapter — precisam da chave e da doc da API
 * pra mapear os campos. Ver docs/INTEGRATIONS.md.
 */
const PROVIDERS: Record<string, CatalogProvider> = {
  [seedProvider.name]: seedProvider,
  [apifyProvider.name]: apifyProvider,
  [kalodataProvider.name]: kalodataProvider,
};

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
  regions?: Region[];
  limit?: number;
  category?: string;
  /** Termos de busca específicos, no lugar do mapa padrão da categoria. */
  terms?: string[];
}

export interface SyncRegionResult {
  region: Region;
  fetched: number;
  saved: number;
  skipped: number;
  error?: string;
}

export interface SyncResult {
  provider: string;
  results: SyncRegionResult[];
  synced: number;
  message: string;
}

/**
 * Busca no provider e grava no Postgres.
 *
 * Uma região que falha não derruba as outras — o erro fica registrado no
 * resultado daquela região. Assim um actor US quebrado não impede o BR.
 */
export async function syncCatalog(options: SyncOptions = {}): Promise<SyncResult> {
  const provider = getProvider(options.provider);
  const limit = Math.min(Math.max(options.limit ?? Number(process.env.CATALOG_SYNC_LIMIT || 100), 1), 1000);

  if (provider.name === 'seed') {
    const total = await prisma.product.count({ where: { active: true } });
    return {
      provider: provider.name,
      results: [],
      synced: 0,
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
      const raw = await provider.fetchTopProducts({
        region,
        limit,
        category: options.category,
        terms: options.terms,
      });
      const normalized = raw
        .map((item) => normalizeProduct(item, provider.name, region))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      let saved = 0;
      for (const product of normalized) {
        const { externalId, ...data } = product;
        await prisma.product.upsert({
          where: {
            provider_region_externalId: {
              provider: provider.name,
              region,
              externalId,
            },
          },
          update: { ...data, externalId, active: true, syncedAt: new Date() },
          create: { ...data, externalId, syncedAt: new Date() },
        });
        saved += 1;
      }

      results.push({
        region,
        fetched: raw.length,
        saved,
        skipped: raw.length - normalized.length,
      });
    } catch (error) {
      results.push({
        region,
        fetched: 0,
        saved: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const synced = results.reduce((total, result) => total + result.saved, 0);
  const failed = results.filter((result) => result.error);

  return {
    provider: provider.name,
    results,
    synced,
    message: failed.length
      ? `${synced} produtos sincronizados. Falhou em: ${failed.map((f) => f.region).join(', ')}.`
      : `${synced} produtos sincronizados de ${provider.name}.`,
  };
}
