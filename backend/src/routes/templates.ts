import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const templateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  marketplace: z.string().trim().max(40).default('shopee'),
  body: z.string().trim().min(5).max(4000),
});

export async function templateRoutes(app: FastifyInstance) {
  app.get('/templates', { preHandler: [app.authenticate] }, async (request) => {
    const templates = await prisma.offerTemplate.findMany({
      where: { userId: request.user.sub },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        marketplace: t.marketplace,
        body: t.body,
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  });

  app.post('/templates', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Datos inválidos.' });

    const template = await prisma.offerTemplate.create({
      data: { ...parsed.data, userId: request.user.sub },
    });

    return { template: { id: template.id } };
  });

  app.put('/templates/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: 'Datos inválidos.' });

    // updateMany com userId no filtro: garante que ninguém edita template alheio
    const updated = await prisma.offerTemplate.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    if (updated.count === 0) return reply.status(404).send({ message: 'Plantilla no encontrada.' });

    return { ok: true };
  });

  app.delete('/templates/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await prisma.offerTemplate.deleteMany({
      where: { id, userId: request.user.sub },
    });
    if (deleted.count === 0) return reply.status(404).send({ message: 'Plantilla no encontrada.' });

    return { ok: true };
  });
}
