'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';

export type SubmitState = { error?: string; ok?: boolean };

export async function submitMission(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const missionId = String(formData.get('missionId') || '');
  const proofUrl = String(formData.get('proofUrl') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!missionId) return { error: 'Missão inválida.' };
  if (!proofUrl) return { error: 'Envie o print da comprovação.' };

  try {
    const result = await apiFetch(`/missions/${missionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ proofUrl, note: note || undefined }),
    });
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não consegui enviar.' };
  }

  revalidatePath('/missoes');
  return { ok: true };
}
