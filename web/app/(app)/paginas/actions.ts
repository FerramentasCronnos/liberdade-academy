'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/session';
import type { LandingPage } from '@/lib/pages';

export type PageState = { error?: string; ok?: boolean };

/** Cria a página e já leva para o editor. */
export async function createPage(formData: FormData) {
  const kind = String(formData.get('kind') || 'presell');
  const template = String(formData.get('template') || 'minimalista');
  const title = String(formData.get('title') || '').trim();
  const config = String(formData.get('config') || '');

  let page: LandingPage | undefined;
  try {
    const result = await apiFetch<{ page: LandingPage }>('/pages', {
      method: 'POST',
      body: JSON.stringify({
        kind,
        template,
        title: title || (kind === 'bio' ? 'Minha Bio' : 'Participe do nosso Grupo no WhatsApp!'),
        subtitle:
          kind === 'bio'
            ? 'Aqui você encontra as melhores ofertas!'
            : 'Lá você recebe ofertas exclusivas direto no seu celular!',
        ...(config ? { config: JSON.parse(config) } : {}),
      }),
    });
    page = result?.page;
  } catch {
    return;
  }

  if (!page) return;

  revalidatePath(`/paginas/${kind === 'bio' ? 'bio' : 'presell'}`);
  redirect(`/paginas/${kind === 'bio' ? 'bio' : 'presell'}/${page.id}`);
}

export async function savePage(_prev: PageState, formData: FormData): Promise<PageState> {
  const id = String(formData.get('id') || '');
  const payload = String(formData.get('payload') || '');
  if (!id || !payload) return { error: 'Dados inválidos.' };

  try {
    const result = await apiFetch(`/pages/${id}`, {
      method: 'PUT',
      body: payload,
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui salvar.' };
  }

  revalidatePath('/paginas/presell');
  revalidatePath('/paginas/bio');
  return { ok: true };
}

export async function togglePublish(formData: FormData) {
  const id = String(formData.get('id') || '');
  const published = String(formData.get('published') || '') === 'true';
  if (!id) return;

  try {
    await apiFetch(`/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ published }),
    });
    revalidatePath('/paginas/presell');
    revalidatePath('/paginas/bio');
  } catch {
    // a tela recarrega com o estado real
  }
}

export async function deletePage(formData: FormData) {
  const id = String(formData.get('id') || '');
  const kind = String(formData.get('kind') || 'presell');
  if (!id) return;

  try {
    await apiFetch(`/pages/${id}`, { method: 'DELETE' });
  } catch {
    // já removida
  }

  revalidatePath(`/paginas/${kind === 'bio' ? 'bio' : 'presell'}`);
  redirect(`/paginas/${kind === 'bio' ? 'bio' : 'presell'}`);
}

/* ------------------------------------------------------------------ grupos */

export type GroupState = { error?: string; ok?: boolean };

export async function addGroup(_prev: GroupState, formData: FormData): Promise<GroupState> {
  const pageId = String(formData.get('pageId') || '');
  const name = String(formData.get('name') || '').trim();
  const inviteUrl = String(formData.get('inviteUrl') || '').trim();
  const limitRaw = String(formData.get('clickLimit') || '').trim();

  if (!name) return { error: 'Dê um nome ao grupo.' };
  if (!/^https:\/\/chat\.whatsapp\.com\//i.test(inviteUrl)) {
    return { error: 'Use um link de convite do WhatsApp (chat.whatsapp.com).' };
  }

  try {
    const result = await apiFetch(`/pages/${pageId}/groups`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        inviteUrl,
        clickLimit: limitRaw ? Number(limitRaw) : null,
      }),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui adicionar.' };
  }

  revalidatePath('/paginas/presell');
  return { ok: true };
}

export async function removeGroup(formData: FormData) {
  const pageId = String(formData.get('pageId') || '');
  const groupId = String(formData.get('groupId') || '');
  if (!pageId || !groupId) return;

  try {
    await apiFetch(`/pages/${pageId}/groups/${groupId}`, { method: 'DELETE' });
    revalidatePath('/paginas/presell');
  } catch {
    // já removido
  }
}

export async function saveRotation(formData: FormData) {
  const pageId = String(formData.get('pageId') || '');
  const rotationAuto = formData.get('rotationAuto');
  const limitRaw = String(formData.get('defaultClickLimit') || '').trim();
  if (!pageId) return;

  try {
    await apiFetch(`/pages/${pageId}/rotation`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(rotationAuto !== null ? { rotationAuto: String(rotationAuto) === 'true' } : {}),
        defaultClickLimit: limitRaw ? Number(limitRaw) : null,
      }),
    });
    revalidatePath('/paginas/presell');
  } catch {
    // a tela recarrega com o estado real
  }
}
