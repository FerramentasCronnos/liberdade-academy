'use server';

import { revalidatePath } from 'next/cache';
import { API_URL } from '@/lib/api';
import { apiFetch, getToken } from '@/lib/session';

export type ProfileState = { error?: string; ok?: boolean };

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const name = String(formData.get('name') || '').trim();
  if (name.length < 2) return { error: 'Informe seu nome.' };

  const payload: Record<string, string | null> = {
    name,
    bio: String(formData.get('bio') || '').trim() || null,
    instagram: String(formData.get('instagram') || '').trim() || null,
    tiktok: String(formData.get('tiktok') || '').trim() || null,
  };

  const avatar = String(formData.get('avatar') || '').trim();
  if (avatar) payload.avatar = avatar;

  try {
    const result = await apiFetch('/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch {
    return { error: 'Não consegui salvar agora.' };
  }

  revalidatePath('/perfil');
  revalidatePath('/comunidade');
  return { ok: true };
}

/** Upload da foto. O arquivo vai direto pra API; devolvemos a URL pública. */
export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const token = await getToken();
  if (!token) return { error: 'Sessão expirada.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Escolha uma imagem.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Imagem maior que 5 MB.' };

  const body = new FormData();
  body.append('file', file);

  try {
    const response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      return { error: data.message || 'Falha no upload.' };
    }

    const data = (await response.json()) as { path: string };
    return { url: `${API_URL}${data.path}` };
  } catch {
    return { error: 'Não consegui enviar a imagem.' };
  }
}
