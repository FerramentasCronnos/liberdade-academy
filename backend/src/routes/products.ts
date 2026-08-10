import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { serializeProduct } from '../lib/serialize.js';
import { syncKalodataProducts } from '../services/kalodata.js';

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', async (request) => {
    const query = request.query as {
      category?: string;
      q?: string;
      viral?: string;
      page?: string;
    };

    const category = query.category && query.category !== 'todos' ? query.category : undefined;
    const q = query.q?.trim();
    const viral = query.viral === 'true';
    const page = Math.max(1, Number(query.page || 1));
    const take = 40;
    const skip = (page - 1) * take;

    const cacheKey = `products:${category || 'all'}:${q || ''}:${viral}:${page}`;
    const cached = await cacheGet<{ products: unknown[]; page: number }>(cacheKey);
    if (cached) return cached;

    const products = await prisma.product.findMany({
      where: {
        active: true,
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
    if (!product) return reply.status(404).send({ message: 'Produto não encontrado.' });
    return { product: serializeProduct(product) };
  });

  app.get('/categories', async () => ({
    categories: [
      { id: 'todos', label: 'Todos', icon: 'apps' },
      { id: 'beleza', label: 'Beleza', icon: 'flower' },
      { id: 'saude', label: 'Saúde', icon: 'fitness' },
      { id: 'fisico', label: 'Físicos', icon: 'cube' },
      { id: 'digital', label: 'Digital', icon: 'cloud-download' },
      { id: 'moda', label: 'Moda', icon: 'shirt' },
      { id: 'casa', label: 'Casa', icon: 'home' },
      { id: 'tech', label: 'Tech', icon: 'hardware-chip' },
      { id: 'fitness', label: 'Fitness', icon: 'barbell' },
    ],
  }));

  app.post('/products/sync-kalodata', { preHandler: [app.authenticate] }, async (_request, reply) => {
    try {
      const result = await syncKalodataProducts();
      return result;
    } catch (error: any) {
      return reply.status(502).send({
        message: error.message || 'Falha ao sincronizar Kalodata.',
      });
    }
  });
}
