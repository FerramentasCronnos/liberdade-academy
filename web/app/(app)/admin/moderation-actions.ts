'use server';

import { revalidatePath } from 'next/cache';
import { approvePendingComment, approvePendingPost, rejectPendingComment, rejectPendingPost } from '@/lib/community-data';
import { getUserId, isAdmin } from '@/lib/session';

/**
 * Fila de moderação: aprovar ou recusar posts e comentários retidos
 * (termo da lista, como reembolso, ou triagem da IA).
 *
 * Checagem de admin no servidor, como nas demais ações administrativas: o
 * botão escondido não protege nada.
 */
async function requireAdmin() {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return null;
  return userId;
}

function refresh(postId: string) {
  revalidatePath('/admin');
  revalidatePath('/comunidade', 'layout');
  revalidatePath(`/comunidade/post/${postId}`);
}

export async function approvePost(formData: FormData) {
  if (!(await requireAdmin())) return;
  const postId = String(formData.get('id') || '');
  if (!postId) return;
  try {
    const result = await approvePendingPost(postId);
    if (result.emailError) console.error('[moderacion] aprovado, mas o e-mail do anúncio falhou:', result.emailError);
  } catch (e) {
    console.error('[moderacion] aprovar falhou', e);
    return;
  }
  refresh(postId);
}

export async function rejectPost(formData: FormData) {
  if (!(await requireAdmin())) return;
  const postId = String(formData.get('id') || '');
  if (!postId) return;
  const note = String(formData.get('note') || '');
  try {
    await rejectPendingPost(postId, note);
  } catch (e) {
    console.error('[moderacion] recusar falhou', e);
    return;
  }
  refresh(postId);
}

export async function approveComment(formData: FormData) {
  if (!(await requireAdmin())) return;
  const commentId = String(formData.get('id') || '');
  if (!commentId) return;
  let postId: string;
  try {
    ({ postId } = await approvePendingComment(commentId));
  } catch (e) {
    console.error('[moderacion] aprovar comentário falhou', e);
    return;
  }
  refresh(postId);
}

export async function rejectComment(formData: FormData) {
  if (!(await requireAdmin())) return;
  const commentId = String(formData.get('id') || '');
  if (!commentId) return;
  const note = String(formData.get('note') || '');
  let postId: string;
  try {
    ({ postId } = await rejectPendingComment(commentId, note));
  } catch (e) {
    console.error('[moderacion] recusar comentário falhou', e);
    return;
  }
  refresh(postId);
}
