'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';

export type TemplateState = { error?: string; ok?: boolean };

export async function saveTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const id = String(formData.get('id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const marketplace = String(formData.get('marketplace') || 'shopee');
  const body = String(formData.get('body') || '').trim();

  if (name.length < 2) return { error: 'Dê um nome ao template.' };
  if (body.length < 5) return { error: 'Escreva a mensagem.' };

  try {
    const result = await apiFetch(id ? `/templates/${id}` : '/templates', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({ name, marketplace, body }),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui salvar.' };
  }

  revalidatePath('/templates');
  return { ok: true };
}

export async function deleteTemplate(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;

  try {
    await apiFetch(`/templates/${id}`, { method: 'DELETE' });
    revalidatePath('/templates');
  } catch {
    // já removido: a lista recarrega
  }
}
