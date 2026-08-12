'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';
import type { AffiliateLink } from '@/lib/affiliate';

export type LinkState = { error?: string; link?: AffiliateLink };

export async function generateLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const url = String(formData.get('url') || '').trim();
  const marketplace = String(formData.get('marketplace') || '').trim();

  if (!url) return { error: 'Cole a URL do produto.' };

  try {
    const result = await apiFetch<{ link: AffiliateLink }>('/affiliate/links', {
      method: 'POST',
      body: JSON.stringify({ url, ...(marketplace ? { marketplace } : {}) }),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };

    revalidatePath('/gerar-link');
    return { link: result.link };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui gerar o link.' };
  }
}

export type AccountState = { error?: string; ok?: boolean };

export async function saveAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const marketplace = String(formData.get('marketplace') || '');
  const publicId = String(formData.get('publicId') || '').trim();

  if (!marketplace) return { error: 'Marketplace inválido.' };

  try {
    const result = await apiFetch('/affiliate/accounts', {
      method: 'PUT',
      body: JSON.stringify({ marketplace, publicId: publicId || null }),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui salvar.' };
  }

  revalidatePath('/gerar-link');
  return { ok: true };
}

export async function deleteLink(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;

  try {
    await apiFetch(`/affiliate/links/${id}`, { method: 'DELETE' });
    revalidatePath('/gerar-link');
  } catch {
    // já sumiu ou falhou: a lista recarrega no próximo load
  }
}
