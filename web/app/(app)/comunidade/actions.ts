'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { togglePostLike } from '@/lib/mutations';
import {
  addComment,
  createSpacePost,
  createTicket,
  deletePost,
  replyTicket,
  setPinned,
  setTicketStatus,
  CommunityError,
} from '@/lib/community-data';
import { SPACE_CATEGORY } from '@/lib/community';
import { getUserId, isAdmin } from '@/lib/session';

export type ComposerState = { error?: string; ok?: boolean };
export type FormState = { error?: string; ok?: boolean };

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

  if (content.length < (image ? 1 : 3)) return { error: 'Escribe un poco más.' };
  if (content.length > 4000) return { error: 'Texto demasiado largo (máx. 4000).' };

  try {
    await createSpacePost({ userId, spaceSlug, title, content, category, image: image || undefined });
  } catch (e) {
    return { error: message(e, 'No pude publicar ahora.') };
  }

  revalidatePath('/comunidade', 'layout');
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

export async function comment(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada.' };

  const postId = String(formData.get('postId') || '');
  const parentId = String(formData.get('parentId') || '') || undefined;
  const content = String(formData.get('content') || '').trim();
  if (content.length < 2) return { error: 'Escribe un poco más.' };
  if (content.length > 2000) return { error: 'Comentario demasiado largo.' };

  try {
    await addComment({ userId, postId, content, parentId });
  } catch (e) {
    return { error: message(e, 'No pude comentar ahora.') };
  }

  revalidatePath(`/comunidade/post/${postId}`);
  revalidatePath('/comunidade', 'layout');
  return { ok: true };
}

export async function pinPost(postId: string, pinned: boolean) {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return;
  await setPinned(postId, pinned);
  revalidatePath('/comunidade', 'layout');
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
  if (subject.length < 3) return { error: 'Ponle un asunto al ticket.' };
  if (content.length < 10) return { error: 'Cuéntanos un poco más para poder ayudarte.' };

  let id: string;
  try {
    id = (await createTicket(userId, subject, content)).id;
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
  if (content.length < 2) return { error: 'Escribe un poco más.' };

  try {
    await replyTicket(ticketId, userId, content);
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
