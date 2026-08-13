'use server';

import { revalidatePath } from 'next/cache';
import {
  createAffiliateLink,
  deleteAffiliateLink,
  DomainError,
  saveAffiliateAccount,
} from '@/lib/mutations';
import { getUserId } from '@/lib/session';
import type { AffiliateLink } from '@/lib/affiliate';

export type LinkState = { error?: string; link?: AffiliateLink };

export async function generateLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const url = String(formData.get('url') || '').trim();
  const marketplace = String(formData.get('marketplace') || '').trim();
  if (!url) return { error: 'Pega la URL del producto.' };

  try {
    const created = await createAffiliateLink(userId, url, marketplace || undefined);
    revalidatePath('/gerar-link');
    return {
      link: {
        id: created.id,
        marketplace: created.marketplace,
        originalUrl: created.originalUrl,
        affiliateUrl: created.affiliateUrl,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude generar el enlace.' };
  }
}

export type AccountState = { error?: string; ok?: boolean };

export async function saveAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const marketplace = String(formData.get('marketplace') || '');
  const publicId = String(formData.get('publicId') || '').trim();
  if (!marketplace) return { error: 'Marketplace inválido.' };

  try {
    await saveAffiliateAccount(userId, marketplace, publicId || null);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude guardar.' };
  }

  revalidatePath('/gerar-link');
  return { ok: true };
}

export async function deleteLink(formData: FormData) {
  const userId = await getUserId();
  const id = String(formData.get('id') || '');
  if (!userId || !id) return;

  await deleteAffiliateLink(userId, id);
  revalidatePath('/gerar-link');
}
