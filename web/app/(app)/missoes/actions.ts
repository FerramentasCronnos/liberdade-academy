'use server';

import { revalidatePath } from 'next/cache';
import { DomainError, submitMissionProof } from '@/lib/mutations';
import { getUserId } from '@/lib/session';

export type SubmitState = { error?: string; ok?: boolean };

export async function submitMission(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const missionId = String(formData.get('missionId') || '');
  const proofUrl = String(formData.get('proofUrl') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!missionId) return { error: 'Misión inválida.' };
  if (!proofUrl) return { error: 'Envía la captura del comprobante.' };

  try {
    await submitMissionProof(userId, missionId, proofUrl, note || undefined);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude enviar.' };
  }

  revalidatePath('/missoes');
  return { ok: true };
}
