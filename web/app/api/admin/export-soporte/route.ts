import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserId, isAdmin } from '@/lib/session';

/**
 * Exporta, para o admin logado, tudo o que chega ao suporte: conversas do
 * widget da IA, tickets e posts dos espaços de suporte da comunidade. Serve
 * para mapear os temas de dúvida fora da plataforma. Contas demo/bot ficam
 * de fora. Só leitura.
 */
const BOT = /bot\.liberdade\.academy|demo\.liberdade\.academy/;

export async function GET() {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) {
    return NextResponse.json({ message: 'Acceso restringido.' }, { status: 403 });
  }

  const [chats, tickets, spaces] = await Promise.all([
    prisma.supportChat.findMany({
      include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ticket.findMany({
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { email: true, isAdmin: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.space.findMany({ select: { id: true, slug: true, name: true, kind: true } }),
  ]);

  const supportSpaces = spaces.filter((s) => /sopor|ayuda|duda|pregunt|support/i.test(s.slug + s.name) || s.kind === 'chat');
  const posts = supportSpaces.length
    ? await prisma.post.findMany({
        where: { spaceId: { in: supportSpaces.map((s) => s.id) } },
        include: {
          space: { select: { slug: true } },
          author: { select: { name: true, email: true, isAdmin: true } },
          comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { email: true, isAdmin: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const data = {
    exportedAt: new Date().toISOString(),
    spaces,
    supportSpaces: supportSpaces.map((s) => s.slug),
    chats: chats
      .filter((c) => !BOT.test(c.user.email))
      .map((c) => ({
        id: c.id,
        assistant: c.assistant,
        escalated: c.escalated,
        createdAt: c.createdAt,
        user: c.user.name,
        email: c.user.email,
        messages: c.messages.map((m) => ({ role: m.role, at: m.createdAt, text: m.content })),
      })),
    tickets: tickets
      .filter((t) => !BOT.test(t.user.email))
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
        user: t.user.name,
        email: t.user.email,
        messages: t.messages.map((m) => ({
          from: m.fromSupport ? 'soporte' : m.author.isAdmin ? 'admin' : 'miembro',
          at: m.createdAt,
          text: m.content,
        })),
      })),
    posts: posts
      .filter((p) => !BOT.test(p.author.email))
      .map((p) => ({
        id: p.id,
        space: p.space?.slug ?? null,
        createdAt: p.createdAt,
        user: p.author.name,
        email: p.author.email,
        admin: p.author.isAdmin,
        reviewStatus: p.reviewStatus,
        text: p.content,
        comments: p.comments.map((c) => ({
          from: c.author.isAdmin ? 'admin' : BOT.test(c.author.email) ? 'ia' : 'miembro',
          at: c.createdAt,
          reviewStatus: c.reviewStatus,
          text: c.content,
        })),
      })),
  };

  const stamp = data.exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 1), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="soporte-mva-${stamp}.json"`,
      'cache-control': 'no-store',
    },
  });
}
