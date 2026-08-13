import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AUTO_MISSIONS, tryCompleteAutoMission } from '../services/missions.js';
import { serializePost } from '../lib/serialize.js';

const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  category: z.enum(['dica', 'resultado', 'duvida', 'motivacao']),
  image: z.string().url().optional(),
});

export async function postRoutes(app: FastifyInstance) {
  app.get('/posts', { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as { category?: string };
    const category =
      query.category && query.category !== 'todos' ? query.category : undefined;

    const posts = await prisma.post.findMany({
      where: category ? { category } : undefined,
      include: {
        author: true,
        likes: true,
        comments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      posts: posts.map((post) => serializePost(post, request.user.sub)),
    };
  });

  app.post('/posts', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = createPostSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Contenido inválido.' });
    }

    const post = await prisma.post.create({
      data: {
        content: parsed.data.content,
        category: parsed.data.category,
        image: parsed.data.image,
        authorId: request.user.sub,
      },
      include: {
        author: true,
        likes: true,
        comments: true,
      },
    });

    await prisma.user.update({
      where: { id: request.user.sub },
      data: {
        communityPosts: { increment: 1 },
        xp: { increment: 20 },
      },
    });

    // missão "Postar na Comunidade" — respeita o cooldown definido na missão
    await tryCompleteAutoMission(request.user.sub, AUTO_MISSIONS.postCommunity);

    return { post: serializePost(post, request.user.sub) };
  });

  app.post('/posts/:id/like', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: request.user.sub,
        },
      },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.postLike.create({
        data: { postId: id, userId: request.user.sub },
      });
      // missão "Engajar Comunidade" — só na curtida, não ao descurtir
      await tryCompleteAutoMission(request.user.sub, AUTO_MISSIONS.engageCommunity);
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: true, likes: true, comments: true },
    });
    if (!post) return reply.status(404).send({ message: 'Publicación no encontrada.' });

    return { post: serializePost(post, request.user.sub) };
  });
}
