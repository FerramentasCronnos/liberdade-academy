'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { togglePostLike } from '@/lib/mutations';
import {
  addComment,
  createSpacePost,
  createTicket,
  deletePost,
  holdPostForReview,
  replyTicket,
  runPostPublishSideEffects,
  setPinned,
  setResolved,
  setTicketStatus,
  CommunityError,
} from '@/lib/community-data';
import { normalizeTag, SPACE_CATEGORY, TICKET_CATEGORIES } from '@/lib/community';
import { screenForReview } from '@/lib/moderation';
import { isOwnMediaUrl } from '@/lib/media';
import { getUserId, isAdmin } from '@/lib/session';
import { scheduleReplyToComment } from '@/lib/assistant-community';

/** `review`: foi para a fila da equipe em vez de publicar; `message` explica isso ao membro. */
export type ComposerState = { error?: string; ok?: boolean; review?: boolean; message?: string };
export type FormState = { error?: string; ok?: boolean };
/** Comentário: `review` quando foi para a fila da equipe; `message` explica isso ao membro. */
export type CommentState = FormState & { review?: boolean; message?: string };

/** Avisa a equipe por e-mail; nunca derruba a ação (o item já está na fila). */
async function emailTeamAboutReview(input: {
  userId: string;
  postId: string;
  term: string;
  excerpt: string;
  title?: string;
  kind: 'post' | 'comment';
  postTitle?: string;
}) {
  try {
    const [{ sendModerationEmail }, author] = await Promise.all([
      import('@/lib/email'),
      prisma.user.findUnique({ where: { id: input.userId }, select: { name: true } }),
    ]);
    await sendModerationEmail({
      postId: input.postId,
      authorName: author?.name ?? 'Un miembro',
      title: input.title,
      excerpt: input.excerpt.slice(0, 600),
      term: input.term,
      kind: input.kind,
      postTitle: input.postTitle,
    });
  } catch (e) {
    console.error('[moderacion] e-mail à equipe falhou', e);
  }
}

/** Só aceita o que veio do nosso armazenamento: evita gravar link arbitrário. */
function parseAttachments(raw: string) {
  try {
    const list = JSON.parse(raw || '[]') as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter((u): u is string => typeof u === 'string')
      .filter(isOwnMediaUrl)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function parseTags(raw: string) {
  return Array.from(new Set(raw.split(',').map(normalizeTag).filter(Boolean))).slice(0, 5);
}

function message(e: unknown, fallback: string) {
  return e instanceof CommunityError ? e.message : fallback;
}

export async function createPost(_prev: ComposerState, formData: FormData): Promise<ComposerState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const spaceSlug = String(formData.get('space') || 'consejos');
  const title = String(formData.get('title') || '').trim().slice(0, 120);
  const content = String(formData.get('content') || '').trim();
  const image = String(formData.get('image') || '').trim();
  const category = String(formData.get('category') || SPACE_CATEGORY[spaceSlug] || 'dica');
  const tags = parseTags(String(formData.get('tags') || ''));
  const attachments = parseAttachments(String(formData.get('attachments') || ''));
  const rawLink = String(formData.get('link') || '').trim();
  const link = /^https?:\/\/\S+$/i.test(rawLink) ? rawLink.slice(0, 500) : '';
  const pinned = formData.get('pinned') === 'on';
  const notify = formData.get('notify') === 'on';
  const scheduledRaw = String(formData.get('scheduledAt') || '');
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : undefined;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return { error: 'Fecha de programación inválida.' };
  if (scheduledAt && scheduledAt.getTime() < Date.now() - 60_000) return { error: 'La fecha de programación ya pasó.' };

  if (rawLink && !link) return { error: 'El enlace debe empezar con http:// o https://.' };
  if (spaceSlug === 'anuncios' && title.length < 3) return { error: 'El anuncio necesita un título.' };
  if (content.length < (image || attachments.length ? 0 : 3)) return { error: 'Escribe un poco más.' };
  if (content.length > 4000) return { error: 'Texto demasiado largo (máx. 4000).' };

  // reembolso ou falar mal da comunidade (lista de termos, depois a IA): entra
  // na fila da equipe em vez de ir ao feed. Admins publicam direto.
  const review = (await isAdmin(userId)) ? { flagged: false as const } : await screenForReview(`${title}\n${content}`.trim());

  let created: Awaited<ReturnType<typeof createSpacePost>>;
  try {
    created = await createSpacePost({
      userId, spaceSlug, title, content, category, image: image || undefined, tags, attachments, link, pinned, scheduledAt, notifyEmail: notify,
      review: review.flagged ? { term: review.term } : undefined,
    });
  } catch (e) {
    return { error: message(e, 'No pude publicar ahora.') };
  }

  if (created.pending && review.flagged) {
    await emailTeamAboutReview({ userId, postId: created.post.id, term: review.term, excerpt: content, title: title || undefined, kind: 'post' });
    revalidatePath('/comunidade', 'layout');
    return { ok: true, review: true, message: 'Tu publicación fue enviada a revisión del equipo. Te avisamos cuando esté publicada.' };
  }

  // IA de suporte (se for dúvida) e, num anúncio com aviso marcado e não
  // agendado, o e-mail para todos. É um lote só, então não vale esconder a
  // falha; agendado: o cron (ou a próxima visita) avisa na hora marcada.
  const { emailError } = await runPostPublishSideEffects(created.post.id);
  revalidatePath('/comunidade', 'layout');
  if (emailError) {
    return { error: `Anuncio publicado, pero el correo falló (${emailError}).` };
  }
  return { ok: true };
}

export async function toggleLike(postId: string) {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await togglePostLike(userId, postId);
    revalidatePath('/comunidade', 'layout');
  } catch {
    // a UI já mostrou o estado otimista e corrige no próximo load
  }
}

export async function comment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada.' };

  const postId = String(formData.get('postId') || '');
  const parentId = String(formData.get('parentId') || '') || undefined;
  const content = String(formData.get('content') || '').trim();
  const attachments = parseAttachments(String(formData.get('attachments') || ''));
  if (content.length < 2 && attachments.length === 0) return { error: 'Escribe un poco más.' };
  if (content.length > 2000) return { error: 'Comentario demasiado largo.' };

  // mesma triagem dos posts: lista de termos e, se nada casar, a IA (admins pulam).
  // O título do post vai de contexto para a IA entender ironia.
  let review: Awaited<ReturnType<typeof screenForReview>> = { flagged: false };
  let postTitle: string | undefined;
  if (!(await isAdmin(userId)) && content) {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { title: true, content: true } });
    postTitle = post ? (post.title || post.content).slice(0, 120) : undefined;
    review = await screenForReview(content, { context: postTitle });
  }

  let created: Awaited<ReturnType<typeof addComment>>;
  try {
    created = await addComment({ userId, postId, content, parentId, attachments, review: review.flagged ? { term: review.term } : undefined });
  } catch (e) {
    return { error: message(e, 'No pude comentar ahora.') };
  }

  if (review.flagged) {
    // sem avisos nem IA de suporte até a aprovação (approvePendingComment roda tudo)
    await emailTeamAboutReview({ userId, postId, term: review.term, excerpt: created.content, kind: 'comment', postTitle });
    revalidatePath(`/comunidade/post/${postId}`);
    revalidatePath('/comunidade', 'layout');
    return { ok: true, review: true, message: 'Tu comentario fue enviado a revisión del equipo. Te avisamos cuando esté publicado.' };
  }

  // o membro seguiu a conversa com a IA na thread
  scheduleReplyToComment(postId, userId);

  revalidatePath(`/comunidade/post/${postId}`);
  revalidatePath('/comunidade', 'layout');
  return { ok: true };
}

export async function resolveThread(postId: string, resolved: boolean): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada.' };
  try {
    await setResolved(postId, userId, resolved);
  } catch (e) {
    return { error: message(e, 'No pude actualizar.') };
  }
  revalidatePath('/comunidade', 'layout');
  return { ok: true };
}

export async function pinPost(postId: string, pinned: boolean) {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return;
  await setPinned(postId, pinned);
  revalidatePath('/comunidade', 'layout');
}

/** Admin: retira um post publicado do feed e o manda à aba Moderación. */
export async function sendPostToReview(postId: string, backTo: string) {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return;
  try {
    await holdPostForReview(postId);
  } catch {
    return;
  }
  revalidatePath('/admin');
  revalidatePath('/comunidade', 'layout');
  revalidatePath(`/comunidade/post/${postId}`);
  redirect(backTo);
}

export async function removePost(postId: string, backTo: string) {
  const userId = await getUserId();
  if (!userId) return;
  try {
    await deletePost(postId, userId);
  } catch {
    return;
  }
  revalidatePath('/comunidade', 'layout');
  redirect(backTo);
}

/* ----------------------------------------------------------------- tickets */

export async function openTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada.' };

  const subject = String(formData.get('subject') || '').trim().slice(0, 120);
  const content = String(formData.get('content') || '').trim();
  const attachments = parseAttachments(String(formData.get('attachments') || ''));
  const rawCategory = String(formData.get('category') || 'otro');
  const category = TICKET_CATEGORIES.some((c) => c.id === rawCategory) ? rawCategory : 'otro';
  if (subject.length < 3) return { error: 'Ponle un asunto al ticket.' };
  if (content.length < 10 && attachments.length === 0) {
    return { error: 'Cuéntanos un poco más, o adjunta un audio o una foto.' };
  }

  let id: string;
  try {
    id = (await createTicket(userId, subject, content, attachments, category)).id;
  } catch {
    return { error: 'No pude abrir el ticket ahora.' };
  }

  revalidatePath('/comunidade/soporte');
  redirect(`/comunidade/soporte/${id}`);
}

export async function answerTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada.' };

  const ticketId = String(formData.get('ticketId') || '');
  const content = String(formData.get('content') || '').trim();
  const attachments = parseAttachments(String(formData.get('attachments') || ''));
  if (content.length < 2 && attachments.length === 0) return { error: 'Escribe algo o adjunta un archivo.' };

  try {
    await replyTicket(ticketId, userId, content, attachments);
  } catch (e) {
    return { error: message(e, 'No pude enviar la respuesta.') };
  }

  revalidatePath(`/comunidade/soporte/${ticketId}`);
  revalidatePath('/comunidade/soporte');
  return { ok: true };
}

export async function changeTicketStatus(ticketId: string, status: string) {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return;
  try {
    await setTicketStatus(ticketId, status);
  } catch {
    return;
  }
  revalidatePath(`/comunidade/soporte/${ticketId}`);
  revalidatePath('/comunidade/soporte');
}
