'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';

export type AdState = { error?: string; ok?: boolean };

export async function createAd(_prev: AdState, formData: FormData): Promise<AdState> {
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category') || 'geral');
  const image = String(formData.get('image') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!image) return { error: 'Envía la imagen del anuncio.' };
  if (title.length < 2) return { error: 'Ponle un nombre al anuncio.' };

  try {
    const result = await apiFetch('/ads', {
      method: 'POST',
      body: JSON.stringify({ title, category, image, notes: notes || null }),
    });
    if (!result) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No pude publicar.' };
  }

  revalidatePath('/anuncios');
  return { ok: true };
}

export async function deleteAd(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;

  try {
    await apiFetch(`/ads/${id}`, { method: 'DELETE' });
    revalidatePath('/anuncios');
  } catch {
    // já removido
  }
}

export async function countDownload(id: string) {
  try {
    await apiFetch(`/ads/${id}/download`, { method: 'POST' });
  } catch {
    // contador é secundário: nunca bloqueia o download
  }
}
