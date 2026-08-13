'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { updateProfile } from '@/lib/mutations';
import { getUserId } from '@/lib/session';

export type ProfileState = { error?: string; ok?: boolean };

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const name = String(formData.get('name') || '').trim();
  if (name.length < 2) return { error: 'Indica tu nombre.' };

  const avatar = String(formData.get('avatar') || '').trim();

  try {
    await updateProfile(userId, {
      name,
      bio: String(formData.get('bio') || '').trim() || null,
      instagram: String(formData.get('instagram') || '').trim() || null,
      tiktok: String(formData.get('tiktok') || '').trim() || null,
      ...(avatar ? { avatar } : {}),
    });
  } catch {
    return { error: 'No pude guardar ahora.' };
  }

  revalidatePath('/perfil');
  revalidatePath('/comunidade');
  return { ok: true };
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Upload de imagem.
 *
 * O disco do Vercel é efêmero, então a imagem vai para o Blob. Mesma função
 * serve foto de perfil, foto de post, print de missão e criativo do baú.
 */
export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  if (!(await getUserId())) return { error: 'Sesión expirada.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Elige una imagen.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Imagen mayor a 5 MB.' };
  if (!ALLOWED.includes(file.type)) {
    return { error: 'Formato no soportado. Usa JPG, PNG, WEBP o GIF.' };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: 'Almacenamiento de imágenes no configurado (BLOB_READ_WRITE_TOKEN).' };
  }

  try {
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const blob = await put(`uploads/${crypto.randomUUID()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    });
    return { url: blob.url };
  } catch {
    return { error: 'No pude subir la imagen.' };
  }
}
