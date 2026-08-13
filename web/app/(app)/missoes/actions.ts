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

  if (!missionId) return { error: 'Misión inválida.' };
  if (!proofUrl) return { error: 'Envía la captura del comprobante.' };

  try {
    const result = await apiFetch(`/missions/${missionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ proofUrl, note: note || undefined }),
    });
    if (!result) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No pude enviar.' };
  }

  revalidatePath('/missoes');
  return { ok: true };
}
