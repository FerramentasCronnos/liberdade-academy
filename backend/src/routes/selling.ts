import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { serializeProduct } from '../lib/serialize.js';

export async function sellingRoutes(app: FastifyInstance) {
  app.get('/me/selling', { preHandler: [app.authenticate] }, async (request) => {
    const items = await prisma.sellingProduct.findMany({
      where: { userId: request.user.sub },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      productIds: items.map((item) => item.productId),
      products: items.map((item) => serializeProduct(item.product)),
    };
  });

  app.post('/me/selling/:productId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return reply.status(404).send({ message: 'Produto não encontrado.' });

    await prisma.sellingProduct.upsert({
      where: {
        userId_productId: {
          userId: request.user.sub,
          productId,
        },
      },
      update: {},
      create: {
        userId: request.user.sub,
        productId,
      },
    });

    return { selling: true, productId };
  });

  app.delete('/me/selling/:productId', { preHandler: [app.authenticate] }, async (request) => {
    const { productId } = request.params as { productId: string };
    await prisma.sellingProduct.deleteMany({
      where: { userId: request.user.sub, productId },
    });
    return { selling: false, productId };
  });
}
