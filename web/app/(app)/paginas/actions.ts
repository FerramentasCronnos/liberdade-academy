'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addPageGroup,
  createLandingPage,
  deleteLandingPage,
  DomainError,
  removePageGroup,
  saveRotation as persistRotation,
  updateLandingPage,
} from '@/lib/mutations';
import { getUserId } from '@/lib/session';

export type PageState = { error?: string; ok?: boolean };

export async function createPage(formData: FormData) {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const kind = String(formData.get('kind') || 'presell');
  const config = String(formData.get('config') || '');
  const title = String(formData.get('title') || '').trim();

  const page = await createLandingPage(userId, {
    kind,
    template: String(formData.get('template') || 'minimalista'),
    title:
      title || (kind === 'bio' ? 'Mi Bio' : '¡Únete a nuestro Grupo de WhatsApp!'),
    subtitle:
      kind === 'bio'
        ? '¡Aquí encuentras las mejores ofertas!'
        : '¡Allí recibes ofertas exclusivas directo en tu celular!',
    ...(config ? { config: JSON.parse(config) } : {}),
  });

  const path = kind === 'bio' ? 'bio' : 'presell';
  revalidatePath(`/paginas/${path}`);
  redirect(`/paginas/${path}/${page.id}`);
}

export async function savePage(_prev: PageState, formData: FormData): Promise<PageState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const id = String(formData.get('id') || '');
  const payload = String(formData.get('payload') || '');
  if (!id || !payload) return { error: 'Datos inválidos.' };

  try {
    await updateLandingPage(userId, id, JSON.parse(payload));
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude guardar.' };
  }

  revalidatePath('/paginas/presell');
  revalidatePath('/paginas/bio');
  return { ok: true };
}

export async function togglePublish(formData: FormData) {
  const userId = await getUserId();
  const id = String(formData.get('id') || '');
  if (!userId || !id) return;

  await updateLandingPage(userId, id, {
    published: String(formData.get('published') || '') === 'true',
  }).catch(() => undefined);

  revalidatePath('/paginas/presell');
  revalidatePath('/paginas/bio');
}

export async function deletePage(formData: FormData) {
  const userId = await getUserId();
  const id = String(formData.get('id') || '');
  const kind = String(formData.get('kind') || 'presell');
  if (!userId || !id) return;

  await deleteLandingPage(userId, id);

  const path = kind === 'bio' ? 'bio' : 'presell';
  revalidatePath(`/paginas/${path}`);
  redirect(`/paginas/${path}`);
}

/* ------------------------------------------------------------------ grupos */

export type GroupState = { error?: string; ok?: boolean };

export async function addGroup(_prev: GroupState, formData: FormData): Promise<GroupState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const pageId = String(formData.get('pageId') || '');
  const name = String(formData.get('name') || '').trim();
  const inviteUrl = String(formData.get('inviteUrl') || '').trim();
  const limitRaw = String(formData.get('clickLimit') || '').trim();

  if (!name) return { error: 'Ponle un nombre al grupo.' };
  if (!/^https:\/\/chat\.whatsapp\.com\//i.test(inviteUrl)) {
    return { error: 'Usa un enlace de invitación de WhatsApp (chat.whatsapp.com).' };
  }

  try {
    await addPageGroup(userId, pageId, {
      name,
      inviteUrl,
      clickLimit: limitRaw ? Number(limitRaw) : null,
    });
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude agregar.' };
  }

  revalidatePath('/paginas/presell');
  return { ok: true };
}

export async function removeGroup(formData: FormData) {
  const userId = await getUserId();
  const pageId = String(formData.get('pageId') || '');
  const groupId = String(formData.get('groupId') || '');
  if (!userId || !pageId || !groupId) return;

  await removePageGroup(userId, pageId, groupId).catch(() => undefined);
  revalidatePath('/paginas/presell');
}

export async function saveRotation(formData: FormData) {
  const userId = await getUserId();
  const pageId = String(formData.get('pageId') || '');
  if (!userId || !pageId) return;

  const rotationAuto = formData.get('rotationAuto');
  const limitRaw = String(formData.get('defaultClickLimit') || '').trim();

  await persistRotation(userId, pageId, {
    ...(rotationAuto !== null ? { rotationAuto: String(rotationAuto) === 'true' } : {}),
    defaultClickLimit: limitRaw ? Number(limitRaw) : null,
  });

  revalidatePath('/paginas/presell');
}
