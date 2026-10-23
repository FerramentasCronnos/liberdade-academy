import type { Post, PostLike, Space as SpaceRow, Ticket, TicketMessage as TicketMessageRow, User } from '@prisma/client';
import { prisma } from './db';
import { scheduleTicketReply } from './assistant-tickets';
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

/* -------------------------------------------------------------- moderação */

/**
 * Publicado para todo mundo: sem moderação ou aprovado.
 * `notIn` deixaria os NULL de fora no SQL, por isso o OR explícito.
 */
const publicReview = { OR: [{ reviewStatus: null }, { reviewStatus: 'approved' }] };

/**
 * O que cada pessoa pode ver além do público: o autor acompanha os próprios
 * posts em revisão ou recusados; a equipe vê a fila de pendentes no feed.
 */
function reviewVisibleTo(viewerId: string, viewerIsAdmin: boolean) {
  return {
    OR: [
      ...publicReview.OR,
      ...(viewerId ? [{ authorId: viewerId }] : []),
      ...(viewerIsAdmin ? [{ reviewStatus: 'pending' }] : []),
    ],
  };
}

/* ---------------------------------------------------------------- espaços */

/** Contador do espaço só com o que está publicado: pendentes não contam. */
const spaceInclude = { _count: { select: { posts: { where: publicReview } } } } as const;

export async function listSpaces(): Promise<Space[]> {
  const rows = await prisma.space.findMany({
    orderBy: { order: 'asc' },
    include: spaceInclude,
  });
  return rows.map(serializeSpace);
}

export async function getSpace(slug: string) {
  const row = await prisma.space.findUnique({
    where: { slug },
    include: spaceInclude,
  });
  return row ? serializeSpace(row) : null;
}

/**
 * Identidade visual dos espaços: nome, emoji e arte da capa.
 *
 * Fica no código (e as artes em /public/spaces) porque é marca, não dado:
 * muda junto com o deploy e pode ser revisado em preview sem tocar o banco.
 * Uma capa enviada pela rota administrativa (coverImage) tem prioridade.
 */
const SPACE_BRANDING: Record<string, { name?: string; emoji?: string; cover?: string }> = {
  presentaciones: { name: 'Networking', emoji: '🤝', cover: '/spaces/presentaciones.jpg' },
  anuncios: { name: 'Novedades', cover: '/spaces/anuncios.jpg' },
  trafico: { cover: '/spaces/trafico.jpg' },
  resultados: { cover: '/spaces/resultados.jpg' },
};

function serializeSpace(row: SpaceRow & { _count: { posts: number } }): Space {
  const brand = SPACE_BRANDING[row.slug] ?? {};
  return {
    id: row.id,
    slug: row.slug,
    name: brand.name ?? row.name,
    description: row.description,
    emoji: brand.emoji ?? row.emoji,
    kind: row.kind,
    order: row.order,
    postCount: row._count.posts,
    coverImage: row.coverImage ?? brand.cover,
  };
}

/** Nome de exibição de um espaço a partir da linha do banco (posts, avisos). */
function spaceLabel(space: SpaceRow) {
  const brand = SPACE_BRANDING[space.slug] ?? {};
  return { name: brand.name ?? space.name, emoji: brand.emoji ?? space.emoji };
}

/* ------------------------------------------------------------------- posts */

type PostRow = Post & {
  author: User;
  likes: PostLike[];
  space: SpaceRow | null;
  _count: { comments: number };
  /** Últimos comentários, só pra mostrar quem participou (avatares) e quando. */
  comments?: Array<{ createdAt: Date; author: { id: string; name: string; avatar: string | null } }>;
};

const postInclude = {
  author: true,
  likes: true,
  space: true,
  _count: { select: { comments: true } },
  comments: {
    orderBy: { createdAt: 'desc' as const },
    take: 8,
    select: { createdAt: true, author: { select: { id: true, name: true, avatar: true } } },
  },
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

/** Até 5 pessoas distintas, na ordem do comentário mais recente. */
function uniqueCommenters(comments: NonNullable<PostRow['comments']>) {
  const seen = new Set<string>();
  const out: Array<{ id: string; name: string; avatar?: string }> = [];
  for (const comment of comments) {
    if (seen.has(comment.author.id)) continue;
    seen.add(comment.author.id);
    out.push({ id: comment.author.id, name: comment.author.name, avatar: comment.author.avatar ?? undefined });
    if (out.length === 5) break;
  }
  return out;
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
    commenters: uniqueCommenters(post.comments ?? []),
    lastCommentAt: post.comments?.[0]?.createdAt.toISOString(),
    isLiked: post.likes.some((like) => like.userId === viewerId),
    createdAt: (post.scheduledAt ?? post.createdAt).toISOString(),
    category: post.category,
    tags: post.tags,
    attachments: post.attachments,
    resolvedAt: post.resolvedAt?.toISOString(),
    link: post.link ?? undefined,
    scheduledAt: post.scheduledAt && post.scheduledAt > new Date() ? post.scheduledAt.toISOString() : undefined,
    // só o que a tela usa: aprovado se comporta como um post normal
    reviewStatus: post.reviewStatus === 'pending' || post.reviewStatus === 'rejected' ? post.reviewStatus : undefined,
    reviewNote: post.reviewStatus === 'rejected' ? post.reviewNote ?? undefined : undefined,
    space: post.space
      ? { slug: post.space.slug, ...spaceLabel(post.space), kind: post.space.kind }
      : undefined,
  };
}

/** Feed geral (todos os espaços) ou de um espaço. Fixados vêm primeiro. */
/** Publicado, ou agendado e já vencido. */
const published = { OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] };

export async function listFeed(viewerId: string, spaceSlug?: string, tag?: string, viewerIsAdmin = false) {
  const posts = await prisma.post.findMany({
    where: {
      ...(spaceSlug ? { space: { slug: spaceSlug } } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      // dois OR no mesmo nível se sobrescreveriam: cada filtro vai no AND
      AND: [reviewVisibleTo(viewerId, viewerIsAdmin), ...(viewerIsAdmin ? [] : [published])],
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
export async function listChat(viewerId: string, spaceSlug: string, viewerIsAdmin = false): Promise<ChatMessage[]> {
  const rows = await prisma.post.findMany({
    where: { space: { slug: spaceSlug }, ...reviewVisibleTo(viewerId, viewerIsAdmin) },
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

export async function getPost(id: string, viewerId: string, viewerIsAdmin = false) {
  const post = await prisma.post.findUnique({ where: { id }, include: postInclude });
  if (!post) return null;
  if (!viewerIsAdmin && post.scheduledAt && post.scheduledAt > new Date()) return null;
  // em revisão ou recusado: só autor e equipe abrem a página
  if ((post.reviewStatus === 'pending' || post.reviewStatus === 'rejected') && !viewerIsAdmin && post.authorId !== viewerId) return null;

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
  link?: string;
  pinned?: boolean;
  scheduledAt?: Date;
  notifyEmail?: boolean;
  /** Termo que mandou o post para revisão: entra como pendente, sem pontos nem avisos. */
  review?: { term: string };
}) {
  const [space, user] = await Promise.all([
    prisma.space.findUnique({ where: { slug: input.spaceSlug } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { isAdmin: true } }),
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
      link: input.link || null,
      pinned: Boolean(input.pinned) && user.isAdmin,
      scheduledAt: input.scheduledAt ?? null,
      notifyEmail: Boolean(input.notifyEmail),
      authorId: input.userId,
      spaceId: space.id,
      // o termo fica em reviewNote até a equipe decidir: a fila mostra o motivo
      ...(input.review ? { reviewStatus: 'pending', reviewNote: input.review.term } : {}),
    },
  });

  if (!input.review) await awardPostCreation(input.userId, space.kind);
  return { post, spaceKind: space.kind, pending: Boolean(input.review) };
}

/**
 * Pontos, contador e missão por publicar. Separado da criação porque um post
 * em revisão só ganha isso quando a equipe aprova.
 */
async function awardPostCreation(userId: string, spaceKind: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { introducedAt: true } });
  if (!user) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      communityPosts: { increment: 1 },
      xp: { increment: 20 },
      ...(spaceKind === 'intro' && !user.introducedAt ? { introducedAt: new Date() } : {}),
    },
  });
  await tryCompleteAutoMission(userId, AUTO_MISSIONS.postCommunity);
}

/**
 * O que acontece depois que um post entra no ar: a IA de suporte avalia se
 * é dúvida e, num anúncio com aviso marcado e não agendado, o e-mail sai para
 * todos. Usado pela ação de publicar e pela aprovação na fila de moderação.
 * Import dinâmico: assistant-community importa este módulo (addComment).
 */
export async function runPostPublishSideEffects(postId: string): Promise<{ emailError?: string }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { notifyEmail: true, scheduledAt: true, notifiedAt: true, space: { select: { kind: true } } },
  });
  if (!post) return {};

  const { scheduleReplyToPost } = await import('./assistant-community');
  scheduleReplyToPost(postId);

  const isDue = !post.scheduledAt || post.scheduledAt <= new Date();
  if (post.space?.kind === 'announcements' && post.notifyEmail && isDue && !post.notifiedAt) {
    const result = await notifyAnnouncement(postId);
    return { emailError: result.error };
  }
  return {};
}

/* ---------------------------------------------------- fila de moderação */

const pendingInclude = {
  author: { select: { id: true, name: true, avatar: true, email: true } },
  space: true,
} as const;

function serializePending(post: Post & { author: { id: string; name: string; avatar: string | null; email: string }; space: SpaceRow | null }) {
  return {
    id: post.id,
    title: post.title ?? undefined,
    content: post.content,
    image: post.image ?? undefined,
    attachments: post.attachments,
    createdAt: post.createdAt.toISOString(),
    status: (post.reviewStatus ?? 'pending') as 'pending' | 'approved' | 'rejected',
    /** Pendente: termo que disparou a revisão. Recusado: nota da equipe (se houver). */
    note: post.reviewNote ?? undefined,
    reviewedAt: post.reviewedAt?.toISOString(),
    author: { id: post.author.id, name: post.author.name, avatar: post.author.avatar ?? undefined, email: post.author.email },
    space: post.space ? { slug: post.space.slug, ...spaceLabel(post.space), kind: post.space.kind } : undefined,
  };
}

export type PendingPost = ReturnType<typeof serializePending>;

/** Fila da equipe: pendentes (mais antigos primeiro) e os 20 últimos já revisados. */
export async function listPendingPosts(): Promise<PendingPost[]> {
  const [pending, reviewed] = await Promise.all([
    prisma.post.findMany({ where: { reviewStatus: 'pending' }, orderBy: { createdAt: 'asc' }, include: pendingInclude }),
    prisma.post.findMany({
      where: { reviewStatus: { in: ['approved', 'rejected'] } },
      orderBy: { reviewedAt: 'desc' },
      take: 20,
      include: pendingInclude,
    }),
  ]);
  return [...pending, ...reviewed].map(serializePending);
}

/**
 * Aprova: vira publicado agora (createdAt = agora, para aparecer como novo),
 * recebe os pontos que ficaram retidos e dispara os efeitos de publicação.
 */
export async function approvePendingPost(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { space: { select: { kind: true } } } });
  if (!post) throw new CommunityError('Publicación no encontrada.');
  if (post.reviewStatus !== 'pending') throw new CommunityError('Esta publicación ya fue revisada.');

  const now = new Date();
  await prisma.post.update({
    where: { id: postId },
    data: { reviewStatus: 'approved', reviewedAt: now, createdAt: now },
  });
  await awardPostCreation(post.authorId, post.space?.kind ?? 'posts');

  await prisma.notification.create({
    data: {
      userId: post.authorId,
      title: 'Tu publicación ya está en la comunidad',
      body: (post.title || post.content).slice(0, 80),
      route: `/comunidade/post/${post.id}`,
    },
  });

  return runPostPublishSideEffects(postId);
}

/** Recusa: o post fica visível só para o autor, com a nota da equipe. */
export async function rejectPendingPost(postId: string, note?: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, title: true, content: true, reviewStatus: true } });
  if (!post) throw new CommunityError('Publicación no encontrada.');
  if (post.reviewStatus !== 'pending') throw new CommunityError('Esta publicación ya fue revisada.');

  const trimmed = note?.trim().slice(0, 500) || null;
  await prisma.post.update({
    where: { id: postId },
    data: { reviewStatus: 'rejected', reviewedAt: new Date(), reviewNote: trimmed },
  });

  await prisma.notification.create({
    data: {
      userId: post.authorId,
      title: 'Tu publicación no fue publicada',
      body: trimmed ?? 'El equipo revisó tu publicación y decidió no publicarla.',
      route: `/comunidade/post/${postId}`,
    },
  });
}

/**
 * Dispara o e-mail de um anúncio já publicado para todos os membros.
 * Usado pela ação de publicar e pela rota administrativa de reenvio.
 */
export async function notifyAnnouncement(postId: string, only?: string[]) {
  const { announcementEmail, sendBatch, isDeliverable } = await import('./email');
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { space: true } });
  if (!post || post.space?.kind !== 'announcements') return { sent: 0, recipients: 0, failed: [] as string[], error: 'No es un anuncio.' };

  // `only`: reenvio para endereços específicos, sem repetir para todo mundo
  const recipients = (only?.length ? only : await listNotifiableEmails()).filter(isDeliverable);
  const mail = announcementEmail({
    title: post.title || 'Nuevo anuncio',
    excerpt: post.content.slice(0, 400),
    postId: post.id,
    image: post.image ?? undefined,
    link: post.link ?? undefined,
  });
  const result = await sendBatch(recipients, mail.subject, mail.html);
  if (result.failed.length) console.error(`[anuncios] falharam: ${result.failed.join(', ')} ${result.error ?? ''}`);
  if (result.sent > 0 && !only?.length) {
    await prisma.post.update({ where: { id: post.id }, data: { notifiedAt: new Date() } });
  }
  return { sent: result.sent, recipients: recipients.length, failed: result.failed, error: result.error };
}

/**
 * Anúncios agendados cuja hora chegou e ainda não avisaram por e-mail.
 * Chamado pelo cron e, por garantia, ao abrir a comunidade.
 */
export async function publishDueAnnouncements() {
  const now = new Date();
  const due = await prisma.post.findMany({
    where: {
      OR: [{ scheduledAt: { lte: now } }, { notifyAt: { lte: now } }],
      notifyEmail: true,
      notifiedAt: null,
      space: { kind: 'announcements' },
      // em revisão não avisa ninguém; a aprovação dispara o e-mail
      AND: [publicReview],
    },
    select: { id: true },
    take: 10,
  });
  const results = [];
  for (const { id } of due) {
    // marca antes de enviar para duas chamadas simultâneas não duplicarem
    const claimed = await prisma.post.updateMany({ where: { id, notifiedAt: null }, data: { notifiedAt: new Date(), notifyAt: null } });
    if (!claimed.count) continue;
    const r = await notifyAnnouncement(id);
    if (r.sent === 0) await prisma.post.update({ where: { id }, data: { notifiedAt: null } });
    results.push({ id, ...r });
  }
  return results;
}

/** Quem recebe avisos por e-mail: contas reais e ativas. */
export async function listNotifiableEmails() {
  const users = await prisma.user.findMany({
    where: {
      NOT: [
        { email: { endsWith: '@demo.liberdade.academy' } },
        { email: { endsWith: '@bot.liberdade.academy' } },
        { planSource: 'kiwify_refunded' },
      ],
    },
    select: { email: true },
  });
  return users.map((u) => u.email);
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
  if (post.space?.kind === 'announcements') throw new CommunityError('Los anuncios no reciben comentarios.');

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
    // equipe (admin) e IA de suporte avisam sempre; entre membros vale o limite de 30 min
    const fromTeam = comment.author.isAdmin || comment.author.email.endsWith('@bot.liberdade.academy');
    await emailAuthorAboutReply(post.id, post.authorId, comment.author.name, comment.content, fromTeam).catch((e) =>
      console.error('[comentarios] e-mail de resposta falhou', e),
    );
  }

  return comment;
}

/** Corta no fim de uma frase ou linha, para o e-mail não parar no meio. */
function excerptAtSentence(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const cut = Math.max(head.lastIndexOf('. '), head.lastIndexOf('.\n'), head.lastIndexOf('\n'), head.lastIndexOf('! '), head.lastIndexOf('? '));
  return (cut > max / 2 ? head.slice(0, cut + 1) : head).trim() + ' …';
}

/**
 * Avisa o autor por e-mail que responderam a publicação dele, com o link.
 * Entre membros, no máximo um e-mail a cada 30 minutos por publicação: numa
 * thread movimentada, o primeiro aviso já traz a pessoa de volta. Resposta da
 * equipe ou da IA de suporte avisa sempre (`fromTeam`): é o que a pessoa espera.
 */
async function emailAuthorAboutReply(postId: string, authorId: string, commenterName: string, content: string, fromTeam = false) {
  const [author, post, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { email: true, name: true, planSource: true } }),
    prisma.post.findUnique({ where: { id: postId }, select: { space: { select: { name: true } } } }),
    prisma.comment.findFirst({
      where: { postId, authorId: { not: authorId }, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }),
  ]);
  if (!author || author.planSource === 'kiwify_refunded') return;
  if (author.email.endsWith('@demo.liberdade.academy') || author.email.endsWith('@bot.liberdade.academy')) return;

  // `recent` é a resposta mais antiga dos últimos 30 min; se não é esta, já avisamos
  if (!fromTeam) {
    const latest = await prisma.comment.findFirst({ where: { postId, authorId: { not: authorId } }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (recent && latest && recent.id !== latest.id) return;
  }

  const { sendReplyEmail, isDeliverable } = await import('./email');
  if (!isDeliverable(author.email)) return;
  await sendReplyEmail({
    to: author.email,
    authorName: author.name,
    commenterName,
    excerpt: excerptAtSentence(content, 400),
    postId,
    spaceName: post?.space?.name,
  });
}

/**
 * Avisa o dono do ticket por e-mail que o suporte (equipe ou IA) respondeu.
 * Usado por replyTicket e pela IA de tickets; nunca falha a resposta em si.
 */
export async function emailTicketReply(ticketId: string, replierName: string, content: string) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { subject: true, user: { select: { email: true, name: true, planSource: true } } },
    });
    const owner = ticket?.user;
    if (!ticket || !owner || owner.planSource === 'kiwify_refunded') return;
    if (owner.email.endsWith('@demo.liberdade.academy') || owner.email.endsWith('@bot.liberdade.academy')) return;
    const { sendReplyEmail, isDeliverable } = await import('./email');
    if (!isDeliverable(owner.email)) return;
    await sendReplyEmail({
      to: owner.email,
      authorName: owner.name,
      commenterName: replierName,
      excerpt: excerptAtSentence(content, 400),
      postId: ticketId,
      spaceName: `tu ticket "${ticket.subject.slice(0, 60)}"`,
      url: `${process.env.APP_URL || 'https://catalogo.s4accelerator.com'}/comunidade/soporte/${ticketId}`,
    });
  } catch (error) {
    console.error('[tickets] e-mail de resposta falhou', error);
  }
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

  scheduleTicketReply(ticket.id); // IA responde depois da resposta HTTP; cala se a equipe assumir
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
    await emailTicketReply(ticketId, user.name, content);
  }
  if (!fromSupport) scheduleTicketReply(ticketId); // só mensagens do membro pedem resposta
}

export async function setTicketStatus(ticketId: string, status: string) {
  if (!['abierto', 'en_progreso', 'resuelto'].includes(status)) throw new CommunityError('Estado inválido.');
  return prisma.ticket.update({ where: { id: ticketId }, data: { status } });
}

export { CommunityError };

/* ------------------------------------------------------- card lateral */

/** Piso de "online agora": a comunidade nunca aparece vazia; o real soma por cima. */
export const ONLINE_FLOOR = 18;
const ONLINE_WINDOW_MS = 10 * 60 * 1000;
const RANKING_DAYS = 30;

export type CommunitySidebarData = {
  members: number;
  admins: number;
  /** Membros vistos nos últimos 10 min somados ao piso. */
  online: number;
  onlineReal: number;
  avatars: Array<{ id: string; name: string; avatar?: string }>;
  /** Engajamento dos últimos 30 dias: posts, comentários e curtidas recebidas. */
  ranking: Array<{ id: string; name: string; avatar?: string; score: number }>;
};

/**
 * Pontuação de engajamento, calculada da atividade (não do saldo de pontos,
 * que também vem de missões): post 10, comentário 5, curtida recebida 2.
 */
export async function getCommunitySidebar(): Promise<CommunitySidebarData> {
  const since = new Date(Date.now() - RANKING_DAYS * 86_400_000);
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);
  const notBot = { NOT: { email: { endsWith: '@bot.liberdade.academy' } } };

  const [members, admins, onlineReal, recent, posts, comments, likes] = await Promise.all([
    prisma.user.count({ where: notBot }),
    prisma.user.count({ where: { isAdmin: true, ...notBot } }),
    prisma.user.count({ where: { lastSeenAt: { gte: onlineSince }, ...notBot } }),
    prisma.user.findMany({
      where: notBot,
      orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { joinedAt: 'desc' }],
      take: 8,
      select: { id: true, name: true, avatar: true },
    }),
    // só o que está publicado pontua: pendente ou recusado não entra no ranking
    prisma.post.groupBy({ by: ['authorId'], where: { createdAt: { gte: since }, ...publicReview }, _count: { _all: true } }),
    prisma.comment.groupBy({ by: ['authorId'], where: { createdAt: { gte: since }, post: publicReview }, _count: { _all: true } }),
    prisma.postLike.findMany({
      where: { createdAt: { gte: since }, post: publicReview },
      select: { post: { select: { authorId: true } } },
    }),
  ]);

  const score = new Map<string, number>();
  const add = (id: string, n: number) => score.set(id, (score.get(id) ?? 0) + n);
  for (const row of posts) add(row.authorId, row._count._all * 10);
  for (const row of comments) add(row.authorId, row._count._all * 5);
  for (const like of likes) add(like.post.authorId, 2);

  const top = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const users = top.length
    ? await prisma.user.findMany({
        where: { id: { in: top.map(([id]) => id) }, ...notBot },
        select: { id: true, name: true, avatar: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const ranking = top
    .filter(([id]) => byId.has(id))
    .slice(0, 5)
    .map(([id, points]) => ({ id, name: byId.get(id)!.name, avatar: byId.get(id)!.avatar ?? undefined, score: points }));

  return {
    members,
    admins,
    onlineReal,
    online: ONLINE_FLOOR + onlineReal,
    avatars: recent.map((u) => ({ id: u.id, name: u.name, avatar: u.avatar ?? undefined })),
    ranking,
  };
}

/**
 * Marca presença. Só grava quando a última marca tem mais de 5 minutos, para
 * não virar um UPDATE por requisição.
 */
export async function touchPresence(userId: string) {
  const stale = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: stale } }] },
    data: { lastSeenAt: new Date() },
  });
}
