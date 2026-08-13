import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { serializeProduct } from '../lib/serialize.js';
import {
  AVAILABLE_PROVIDERS,
  CatalogConfigError,
  configuredRegions,
  getProvider,
  isRegion,
  syncCatalog,
  type Region,
} from '../services/catalog/index.js';

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', async (request) => {
    const query = request.query as {
      category?: string;
      q?: string;
      viral?: string;
      region?: string;
      page?: string;
      limit?: string;
    };

    const category = query.category && query.category !== 'todos' ? query.category : undefined;
    const q = query.q?.trim();
    const viral = query.viral === 'true';
    // region ausente = todas as regiões (o app decide se filtra)
    const region =
      query.region && query.region !== 'todos' && isRegion(query.region.toUpperCase())
        ? (query.region.toUpperCase() as Region)
        : undefined;
    const page = Math.max(1, Number(query.page || 1));
    // teto de 200 para uma resposta grande não virar consulta cara sem querer
    const take = Math.min(Math.max(1, Number(query.limit || 40)), 200);
    const skip = (page - 1) * take;

    const cacheKey = `products:${region || 'all'}:${category || 'all'}:${q || ''}:${viral}:${page}:${take}`;
    const cached = await cacheGet<{ products: unknown[]; page: number }>(cacheKey);
    if (cached) return cached;

    const products = await prisma.product.findMany({
      where: {
        active: true,
        // produto sem foto não vai pra vitrine — card vazio parece bug
        image: { startsWith: 'http' },
        ...(region ? { region } : {}),
        ...(category ? { category } : {}),
        ...(viral ? { isViral: true } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isViral: 'desc' }, { salesCount: 'desc' }],
      skip,
      take,
    });

    const payload = {
      products: products.map(serializeProduct),
      page,
    };
    await cacheSet(cacheKey, payload, 30);
    return payload;
  });

  app.get('/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.status(404).send({ message: 'Producto no encontrado.' });
    return { product: serializeProduct(product) };
  });

  app.get('/categories', async () => ({
    categories: [
      { id: 'todos', label: 'Todos', icon: 'apps' },
      { id: 'beleza', label: 'Belleza', icon: 'flower' },
      { id: 'saude', label: 'Salud', icon: 'fitness' },
      { id: 'fisico', label: 'Físicos', icon: 'cube' },
      { id: 'digital', label: 'Digital', icon: 'cloud-download' },
      { id: 'moda', label: 'Moda', icon: 'shirt' },
      { id: 'casa', label: 'Casa', icon: 'home' },
      { id: 'tech', label: 'Tech', icon: 'hardware-chip' },
      { id: 'fitness', label: 'Fitness', icon: 'barbell' },
    ],
  }));

  /** Diagnóstico: qual provider está ativo e o que já existe por região. */
  app.get('/catalog/status', async () => {
    const provider = getProvider();
    const grouped = await prisma.product.groupBy({
      by: ['region', 'provider'],
      where: { active: true },
      _count: { _all: true },
    });

    return {
      provider: provider.name,
      configured: provider.isConfigured(),
      missingConfig: provider.isConfigured() ? undefined : provider.missingConfigMessage(),
      supportedRegions: provider.supportedRegions,
      syncRegions: configuredRegions(),
      availableProviders: AVAILABLE_PROVIDERS,
      counts: grouped.map((row) => ({
        region: row.region,
        provider: row.provider,
        products: row._count._all,
      })),
    };
  });

  /** Sync genérico — funciona com qualquer provider registrado. */
  app.post('/products/sync', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = (request.body || {}) as {
      provider?: string;
      regions?: string[];
      limit?: number;
      category?: string;
      terms?: string[];
    };

    const regions = (body.regions || [])
      .map((value) => value.trim().toUpperCase())
      .filter(isRegion) as Region[];

    try {
      return await syncCatalog({
        provider: body.provider,
        regions,
        limit: body.limit,
        category: body.category,
        terms: body.terms?.slice(0, 20),
      });
    } catch (error) {
      if (error instanceof CatalogConfigError) {
        return reply.status(422).send({ message: error.message });
      }
      return reply.status(502).send({
        message: error instanceof Error ? error.message : 'Falló la sincronización del catálogo.',
      });
    }
  });

  /** @deprecated use POST /products/sync. Mantido para não quebrar chamadas antigas. */
  app.post('/products/sync-kalodata', { preHandler: [app.authenticate] }, async (_request, reply) => {
    try {
      return await syncCatalog({ provider: 'kalodata' });
    } catch (error) {
      if (error instanceof CatalogConfigError) {
        return reply.status(422).send({ message: error.message });
      }
      return reply.status(502).send({
        message: error instanceof Error ? error.message : 'Falha ao sincronizar Kalodata.',
      });
    }
  });
}
