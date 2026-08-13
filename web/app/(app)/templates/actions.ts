'use server';

import { revalidatePath } from 'next/cache';
import { DomainError, deleteTemplate as removeTemplate, saveTemplate as persist } from '@/lib/mutations';
import { getUserId } from '@/lib/session';

export type TemplateState = { error?: string; ok?: boolean };

export async function saveTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const id = String(formData.get('id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const marketplace = String(formData.get('marketplace') || 'shopee');
  const body = String(formData.get('body') || '').trim();

  if (name.length < 2) return { error: 'Ponle un nombre a la plantilla.' };
  if (body.length < 5) return { error: 'Escribe el mensaje.' };

  try {
    await persist(userId, { id: id || undefined, name, marketplace, body });
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude guardar.' };
  }

  revalidatePath('/templates');
  return { ok: true };
}

export async function deleteTemplate(formData: FormData) {
  const userId = await getUserId();
  const id = String(formData.get('id') || '');
  if (!userId || !id) return;

  await removeTemplate(userId, id);
  revalidatePath('/templates');
}
