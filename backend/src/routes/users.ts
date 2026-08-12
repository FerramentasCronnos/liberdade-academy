import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializePost, serializeUser } from '../lib/serialize.js';

/** Aceita "@usuario", "usuario" ou a URL completa; guarda só o handle. */
function normalizeHandle(value?: string | null) {
  if (value == null) return null;
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .trim();
  return cleaned ? cleaned.slice(0, 60) : null;
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(160).nullish(),
  instagram: z.string().trim().max(120).nullish(),
  tiktok: z.string().trim().max(120).nullish(),
  avatar: z.string().trim().url().max(500).nullish(),
});

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

  /** Perfil público do membro — usado no Perfil da Comunidade. */
  app.get('/users/:id/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { author: true, likes: true, comments: true },
        },
      },
    });
    if (!user) return reply.status(404).send({ message: 'Membro não encontrado.' });

    const likesReceived = await prisma.postLike.count({
      where: { post: { authorId: id } },
    });

    return {
      user: serializeUser(user),
      stats: {
        posts: user.posts.length,
        likesReceived,
      },
      posts: user.posts.map((post) => serializePost(post, request.user.sub)),
    };
  });

  app.put('/users/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Dados de perfil inválidos.' });
    }

    const { name, bio, instagram, tiktok, avatar } = parsed.data;

    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data: {
        // undefined = campo não enviado (mantém); null = limpar
        ...(name !== undefined ? { name } : {}),
        ...(bio !== undefined ? { bio: bio?.trim() || null } : {}),
        ...(instagram !== undefined ? { instagram: normalizeHandle(instagram) } : {}),
        ...(tiktok !== undefined ? { tiktok: normalizeHandle(tiktok) } : {}),
        ...(avatar !== undefined ? { avatar: avatar || null } : {}),
      },
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
