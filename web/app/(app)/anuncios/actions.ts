'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';

export type AdState = { error?: string; ok?: boolean };

export async function createAd(_prev: AdState, formData: FormData): Promise<AdState> {
  const title = String(formData.get('title') || '').trim();
  const category = String(formData.get('category') || 'geral');
  const image = String(formData.get('image') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!image) return { error: 'Envie a imagem do anúncio.' };
  if (title.length < 2) return { error: 'Dê um nome ao anúncio.' };

  try {
    const result = await apiFetch('/ads', {
      method: 'POST',
      body: JSON.stringify({ title, category, image, notes: notes || null }),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui publicar.' };
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
