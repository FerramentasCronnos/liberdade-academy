'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';
import type { CommunityPost } from '@/lib/community';

export type ComposerState = { error?: string; ok?: boolean };

export async function createPost(
  _prev: ComposerState,
  formData: FormData,
): Promise<ComposerState> {
  const content = String(formData.get('content') || '').trim();
  const category = String(formData.get('category') || 'dica');
  const image = String(formData.get('image') || '').trim();

  // com foto, uma legenda curta basta
  const minLength = image ? 1 : 3;
  if (content.length < minLength) return { error: 'Escribe un poco más.' };
  if (content.length > 2000) return { error: 'Texto demasiado largo (máx. 2000).' };

  try {
    const result = await apiFetch<{ post: CommunityPost }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, category, ...(image ? { image } : {}) }),
    });
    if (!result) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };
  } catch {
    return { error: 'No pude publicar ahora.' };
  }

  revalidatePath('/comunidade');
  return { ok: true };
}

export async function toggleLike(postId: string) {
  try {
    await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
    revalidatePath('/comunidade');
  } catch {
    // silencioso: a UI já mostrou o estado otimista e volta no próximo load
  }
}
