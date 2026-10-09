import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSpacePost, addComment } from '@/lib/community-data';
import { processComment, processPost } from '@/lib/assistant-community';

/**
 * Teste da IA na comunidade (CRON_SECRET): publica como um membro de teste,
 * roda a resposta automática na hora e, com cleanup=1, apaga tudo depois.
 *   { "email": "...", "space": "soporte-general", "content": "...", "followUp": "...", "cleanup": true }
 */
export const maxDuration = 120;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; space?: string; content?: string; followUp?: string; cleanup?: boolean; postId?: string; latest?: string };

  // inspeção: últimas conversas do widget de suporte
  if (body.latest === 'chats') {
    const chats = await prisma.supportChat.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json({
      chats: chats.map((c) => ({ id: c.id, at: c.updatedAt, by: c.user.name, assistant: c.assistant, escalated: c.escalated, messages: c.messages.map((m) => `${m.role}: ${m.content.slice(0, 160)}`) })),
    });
  }
  // inspeção: últimas publicações de um espaço (ou de todos com "*"), ou processar uma existente
  if (body.latest) {
    const posts = await prisma.post.findMany({
      where: body.latest === '*' ? {} : { space: { slug: body.latest } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { space: { select: { slug: true } }, author: { select: { name: true, email: true, isAdmin: true } }, comments: { include: { author: { select: { name: true } } } } },
    });
    return NextResponse.json({ posts: posts.map((p) => ({ id: p.id, at: p.createdAt, space: p.space?.slug, by: p.author.name, admin: p.author.isAdmin, content: p.content.slice(0, 160), replies: p.comments.map((c) => c.author.name) })) });
  }
  if (body.postId) {
    return NextResponse.json({ postId: body.postId, result: await processPost(body.postId) });
  }
  const user = body.email ? await prisma.user.findUnique({ where: { email: body.email } }) : null;
  if (!user || !body.space || !body.content) return NextResponse.json({ message: 'email, space, content' }, { status: 400 });

  const { post } = await createSpacePost({ userId: user.id, spaceSlug: body.space, content: body.content, category: 'duvida' });
  const log: Record<string, unknown> = { postId: post.id };
  try {
    log.first = await processPost(post.id);
    if (body.followUp) {
      await addComment({ userId: user.id, postId: post.id, content: body.followUp });
      log.second = await processComment(post.id, user.id);
    }
    const comments = await prisma.comment.findMany({ where: { postId: post.id }, orderBy: { createdAt: 'asc' }, include: { author: true } });
    log.thread = comments.map((c) => ({ by: c.author.name, text: c.content }));
  } finally {
    if (body.cleanup) {
      await prisma.post.delete({ where: { id: post.id } }).catch(() => undefined);
      await prisma.user.update({ where: { id: user.id }, data: { communityPosts: { decrement: 1 } } }).catch(() => undefined);
      log.cleanup = true;
    }
  }
  return NextResponse.json(log);
}
