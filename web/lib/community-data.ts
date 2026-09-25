import type { Post, PostLike, Space as SpaceRow, Ticket, TicketMessage as TicketMessageRow, User } from '@prisma/client';
import { prisma } from './db';
import { AUTO_MISSIONS, tryCompleteAutoMission } from './domain/missions';
import type {
  CommunityComment,
  CommunityPost,
  Space,
  TicketDetail,
  TicketSummary,
} from './community';

/**
 * Leitura e escrita da comunidade em espaços, comentários e tickets.
 *
 * Fica separado de queries.ts/mutations.ts porque é o maior bloco do app e
 * evolui junto: tudo o que a tela de comunidade precisa está aqui.
 */

class CommunityError extends Error {}

/* ---------------------------------------------------------------- espaços */

export async function listSpaces(): Promise<Space[]> {
  const rows = await prisma.space.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { posts: true } } },
  });
  return rows.map(serializeSpace);
}

export async function getSpace(slug: string) {
  const row = await prisma.space.findUnique({
    where: { slug },
    include: { _count: { select: { posts: true } } },
  });
  return row ? serializeSpace(row) : null;
}

function serializeSpace(row: SpaceRow & { _count: { posts: number } }): Space {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    kind: row.kind,
    order: row.order,
    postCount: row._count.posts,
  };
}

/* ------------------------------------------------------------------- posts */

type PostRow = Post & {
  author: User;
  likes: PostLike[];
  space: SpaceRow | null;
  _count: { comments: number };
};

const postInclude = {
  author: true,
  likes: true,
  space: true,
  _count: { select: { comments: true } },
} as const;

function author(user: User) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? undefined,
    level: user.level,
    isAdmin: user.isAdmin,
  };
}

function serializePost(post: PostRow, viewerId: string): CommunityPost {
  return {
    id: post.id,
    author: author(post.author),
    title: post.title ?? undefined,
    content: post.content,
    image: post.image ?? undefined,
    pinned: post.pinned,
    likes: post.likes.length,
    comments: post._count.comments,
    isLiked: post.likes.some((like) => like.userId === viewerId),
    createdAt: post.createdAt.toISOString(),
    category: post.category,
    tags: post.tags,
    attachments: post.attachments,
    resolvedAt: post.resolvedAt?.toISOString(),
    space: post.space
      ? { slug: post.space.slug, name: post.space.name, emoji: post.space.emoji, kind: post.space.kind }
      : undefined,
  };
}

/** Feed geral (todos os espaços) ou de um espaço. Fixados vêm primeiro. */
export async function listFeed(viewerId: string, spaceSlug?: string, tag?: string) {
  const posts = await prisma.post.findMany({
    where: {
      ...(spaceSlug ? { space: { slug: spaceSlug } } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: spaceSlug ? [{ pinned: 'desc' }, { createdAt: 'desc' }] : { createdAt: 'desc' },
    take: 60,
    include: postInclude,
  });
  return posts.map((p) => serializePost(p, viewerId));
}

export interface ChatMessage extends CommunityPost {
  replies: CommunityComment[];
}

/** Espaço em modo chat: as últimas 100 mensagens, da mais antiga à mais nova. */
export async function listChat(viewerId: string, spaceSlug: string): Promise<ChatMessage[]> {
  const rows = await prisma.post.findMany({
    where: { space: { slug: spaceSlug } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { ...postInclude, comments: { orderBy: { createdAt: 'asc' }, include: { author: true } } },
  });

  return rows.reverse().map((p) => ({
    ...serializePost(p, viewerId),
    replies: p.comments.map((c) => ({
      id: c.id,
      author: author(c.author),
      content: c.content,
      attachments: c.attachments,
      createdAt: c.createdAt.toISOString(),
      parentId: c.parentId ?? undefined,
      replies: [],
    })),
  }));
}

export async function getPost(id: string, viewerId: string) {
  const post = await prisma.post.findUnique({ where: { id }, include: postInclude });
  if (!post) return null;

  const comments = await prisma.comment.findMany({
    where: { postId: id },
    orderBy: { createdAt: 'asc' },
    include: { author: true },
  });

  // um nível de resposta, como no Circle
  const byId = new Map<string, CommunityComment>();
  const roots: CommunityComment[] = [];
  for (const c of comments) {
    byId.set(c.id, {
      id: c.id,
      author: author(c.author),
      content: c.content,
      attachments: c.attachments,
      createdAt: c.createdAt.toISOString(),
      parentId: c.parentId ?? undefined,
      replies: [],
    });
  }
  for (const c of byId.values()) {
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.replies.push(c);
    else roots.push(c);
  }

  return { post: serializePost(post, viewerId), comments: roots };
}

export async function createSpacePost(input: {
  userId: string;
  spaceSlug: string;
  title?: string;
  content: string;
  category: string;
  image?: string;
  tags?: string[];
  attachments?: string[];
}) {
  const [space, user] = await Promise.all([
    prisma.space.findUnique({ where: { slug: input.spaceSlug } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { isAdmin: true, introducedAt: true } }),
  ]);
  if (!space || !user) throw new CommunityError('Espacio no encontrado.');
  if (space.kind === 'announcements' && !user.isAdmin) {
    throw new CommunityError('Solo el equipo publica anuncios.');
  }

  const post = await prisma.post.create({
    data: {
      title: input.title || null,
      content: input.content,
      category: input.category,
      image: input.image,
      tags: input.tags ?? [],
      attachments: input.attachments ?? [],
      authorId: input.userId,
      spaceId: space.id,
    },
  });

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      communityPosts: { increment: 1 },
      xp: { increment: 20 },
      ...(space.kind === 'intro' && !user.introducedAt ? { introducedAt: new Date() } : {}),
    },
  });

  await tryCompleteAutoMission(input.userId, AUTO_MISSIONS.postCommunity);
  return post;
}

/** Finaliza ou reabre a atención de uma mensagem do chat. Equipe ou autor. */
export async function setResolved(postId: string, userId: string, resolved: boolean) {
  const [post, user] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
  ]);
  if (!post || !user) throw new CommunityError('Mensaje no encontrado.');
  if (!user.isAdmin && post.authorId !== userId) throw new CommunityError('Sin permiso.');
  // só a equipe reabre
  if (!resolved && !user.isAdmin) throw new CommunityError('Solo el equipo reabre una atención.');
  return prisma.post.update({ where: { id: postId }, data: { resolvedAt: resolved ? new Date() : null } });
}

export async function setPinned(postId: string, pinned: boolean) {
  return prisma.post.update({ where: { id: postId }, data: { pinned } });
}

/** Autor ou admin. Cascade leva curtidas e comentários junto. */
export async function deletePost(postId: string, userId: string) {
  const [post, user] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
  ]);
  if (!post) return;
  if (post.authorId !== userId && !user?.isAdmin) throw new CommunityError('Sin permiso.');
  await prisma.post.delete({ where: { id: postId } });
}

/* ------------------------------------------------------------- comentários */

export async function addComment(input: {
  userId: string;
  postId: string;
  content: string;
  parentId?: string;
  attachments?: string[];
}) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: {
      id: true, authorId: true, title: true, content: true, resolvedAt: true,
      space: { select: { kind: true } },
      _count: { select: { comments: true } },
    },
  });
  if (!post) throw new CommunityError('Publicación no encontrada.');

  // Chat de suporte: a equipe abre a thread; o autor responde dentro dela;
  // ninguém escreve numa atención finalizada.
  if (post.space?.kind === 'chat') {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { isAdmin: true } });
    const isAuthor = post.authorId === input.userId;
    if (!user?.isAdmin && !isAuthor) throw new CommunityError('Solo el equipo responde en este espacio.');
    if (post.resolvedAt) throw new CommunityError('Esta atención ya fue finalizada.');
    if (!user?.isAdmin && post._count.comments === 0) {
      throw new CommunityError('Espera la respuesta del equipo para continuar aquí.');
    }
  }

  // resposta de resposta vira resposta do comentário raiz: só um nível
  let parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { parentId: true, postId: true } });
    if (!parent || parent.postId !== post.id) parentId = null;
    else if (parent.parentId) parentId = parent.parentId;
  }

  const comment = await prisma.comment.create({
    data: { content: input.content, attachments: input.attachments ?? [], postId: post.id, authorId: input.userId, parentId },
    include: { author: true },
  });

  await tryCompleteAutoMission(input.userId, AUTO_MISSIONS.engageCommunity);

  if (post.authorId !== input.userId) {
    const excerpt = (post.title || post.content).slice(0, 60);
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        title: `${comment.author.name} comentó tu publicación`,
        body: excerpt,
        route: `/comunidade/post/${post.id}`,
      },
    });
  }

  return comment;
}

/* ----------------------------------------------------------------- membros */

export async function listMembers(q?: string) {
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { niche: { contains: q, mode: 'insensitive' } }] }
      : {},
    orderBy: [{ isAdmin: 'desc' }, { xp: 'desc' }],
    take: 200,
    select: {
      id: true, name: true, avatar: true, level: true, isAdmin: true, niche: true, bio: true,
      joinedAt: true, introducedAt: true, communityPosts: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar ?? undefined,
    level: u.level,
    isAdmin: u.isAdmin,
    niche: u.niche ?? undefined,
    bio: u.bio ?? undefined,
    joinedAt: u.joinedAt.toISOString(),
    introduced: Boolean(u.introducedAt),
    posts: u.communityPosts,
  }));
}

export type MemberCard = Awaited<ReturnType<typeof listMembers>>[number];

/* ----------------------------------------------------------------- tickets */

type TicketRow = Ticket & {
  user: User;
  messages: Array<TicketMessageRow & { author: User }>;
  _count: { messages: number };
};

function serializeTicket(t: TicketRow, forSupport: boolean): TicketSummary {
  const last = t.messages[t.messages.length - 1];
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    lastMessageAt: t.lastMessageAt.toISOString(),
    messageCount: t._count.messages,
    awaitingSupport: t.status !== 'resuelto' && Boolean(last) && !last.fromSupport,
    user: {
      id: t.user.id,
      name: t.user.name,
      avatar: t.user.avatar ?? undefined,
      email: forSupport ? t.user.email : undefined,
    },
  };
}

const ticketInclude = {
  user: true,
  messages: { orderBy: { createdAt: 'asc' as const }, include: { author: true } },
  _count: { select: { messages: true } },
} as const;

/** Membro vê os próprios; a equipe vê todos. */
export async function listTickets(userId: string, forSupport: boolean) {
  const rows = await prisma.ticket.findMany({
    where: forSupport ? {} : { userId },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
    include: ticketInclude,
  });
  return rows.map((t) => serializeTicket(t, forSupport));
}

export async function getTicket(id: string, userId: string, forSupport: boolean): Promise<TicketDetail | null> {
  const t = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!t) return null;
  if (!forSupport && t.userId !== userId) return null;

  return {
    ...serializeTicket(t, forSupport),
    messages: t.messages.map((m) => ({
      id: m.id,
      content: m.content,
      attachments: m.attachments,
      createdAt: m.createdAt.toISOString(),
      fromSupport: m.fromSupport,
      author: { id: m.author.id, name: m.author.name, avatar: m.author.avatar ?? undefined },
    })),
  };
}

export async function createTicket(userId: string, subject: string, content: string, attachments: string[] = [], category = 'otro') {
  const ticket = await prisma.ticket.create({
    data: {
      subject,
      category,
      userId,
      messages: { create: { content, attachments, authorId: userId, fromSupport: false } },
    },
  });

  // avisa toda a equipe
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: 'Nuevo ticket de soporte',
        body: subject.slice(0, 80),
        route: `/comunidade/soporte/${ticket.id}`,
      })),
    });
  }

  return ticket;
}

export async function replyTicket(ticketId: string, userId: string, content: string, attachments: string[] = []) {
  const [ticket, user] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true, name: true } }),
  ]);
  if (!ticket || !user) throw new CommunityError('Ticket no encontrado.');
  if (!user.isAdmin && ticket.userId !== userId) throw new CommunityError('Sin permiso.');

  const fromSupport = user.isAdmin && ticket.userId !== userId;

  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId, authorId: userId, content, attachments, fromSupport } }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        lastMessageAt: new Date(),
        // resposta da equipe move para "en progreso"; do membro reabre
        status: fromSupport
          ? ticket.status === 'resuelto' ? 'resuelto' : 'en_progreso'
          : ticket.status === 'resuelto' ? 'abierto' : ticket.status,
      },
    }),
  ]);

  if (fromSupport) {
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        title: 'El equipo respondió tu ticket',
        body: ticket.subject.slice(0, 80),
        route: `/comunidade/soporte/${ticket.id}`,
      },
    });
  }
}

export async function setTicketStatus(ticketId: string, status: string) {
  if (!['abierto', 'en_progreso', 'resuelto'].includes(status)) throw new CommunityError('Estado inválido.');
  return prisma.ticket.update({ where: { id: ticketId }, data: { status } });
}

export { CommunityError };
