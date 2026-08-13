'use server';

import { revalidatePath } from 'next/cache';
import { countAdDownload, createAd as persistAd, deleteAd as removeAd } from '@/lib/mutations';
import { getUserId, isAdmin } from '@/lib/session';

export type AdState = { error?: string; ok?: boolean };

export async function createAd(_prev: AdState, formData: FormData): Promise<AdState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };
  // o baú é curadoria: só a administração publica
  if (!(await isAdmin(userId))) return { error: 'Acceso restringido.' };

  const title = String(formData.get('title') || '').trim();
  const image = String(formData.get('image') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!image) return { error: 'Envía la imagen del anuncio.' };
  if (title.length < 2) return { error: 'Ponle un nombre al anuncio.' };

  try {
    await persistAd(userId, {
      title,
      category: String(formData.get('category') || 'geral'),
      image,
      notes: notes || null,
    });
  } catch {
    return { error: 'No pude publicar.' };
  }

  revalidatePath('/anuncios');
  return { ok: true };
}

export async function deleteAd(formData: FormData) {
  const userId = await getUserId();
  const id = String(formData.get('id') || '');
  if (!userId || !id || !(await isAdmin(userId))) return;

  await removeAd(id);
  revalidatePath('/anuncios');
}

export async function countDownload(id: string) {
  await countAdDownload(id);
}
