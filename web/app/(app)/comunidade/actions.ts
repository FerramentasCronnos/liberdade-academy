'use server';

import { revalidatePath } from 'next/cache';
import { createPost, togglePostLike } from '@/lib/mutations';
import { getUserId } from '@/lib/session';

export type ComposerState = { error?: string; ok?: boolean };

export async function createPostAction(
  _prev: ComposerState,
  formData: FormData,
): Promise<ComposerState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const content = String(formData.get('content') || '').trim();
  const category = String(formData.get('category') || 'dica');
  const image = String(formData.get('image') || '').trim();

  // com foto, uma legenda curta basta
  if (content.length < (image ? 1 : 3)) return { error: 'Escribe un poco más.' };
  if (content.length > 2000) return { error: 'Texto demasiado largo (máx. 2000).' };

  try {
    await createPost(userId, content, category, image || undefined);
  } catch {
    return { error: 'No pude publicar ahora.' };
  }

  revalidatePath('/comunidade');
  return { ok: true };
}

export { createPostAction as createPost };

export async function toggleLike(postId: string) {
  const userId = await getUserId();
  if (!userId) return;

  try {
    await togglePostLike(userId, postId);
    revalidatePath('/comunidade');
  } catch {
    // a UI já mostrou o estado otimista e corrige no próximo load
  }
}
