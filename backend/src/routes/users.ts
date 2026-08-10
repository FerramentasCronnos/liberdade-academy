import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeUser } from '../lib/serialize.js';

const onboardingSchema = z.object({
  niche: z.string(),
  alreadySelling: z.boolean(),
  revenueRange: z.string().optional(),
  goal: z.string(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
    });
    return { user: serializeUser(user) };
  });

  app.put('/users/me/onboarding', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = onboardingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Dados de onboarding inválidos.' });
    }

    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data: {
        onboardingCompleted: true,
        niche: parsed.data.niche,
        alreadySelling: parsed.data.alreadySelling,
        revenueRange: parsed.data.alreadySelling ? parsed.data.revenueRange : null,
        goal: parsed.data.goal,
        onboardingAt: new Date(),
      },
    });

    return { user: serializeUser(user) };
  });
}
