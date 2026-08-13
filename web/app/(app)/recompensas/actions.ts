'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/session';

export type RedeemState = { error?: string; ok?: boolean };

export async function redeemReward(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const rewardId = String(formData.get('rewardId') || '');
  if (!rewardId) return { error: 'Recompensa inválida.' };

  try {
    const result = await apiFetch(`/rewards/${rewardId}/redeem`, { method: 'POST' });
    if (!result) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };
  } catch (e) {
    // a API devolve "Pontos insuficientes", "Recompensa esgotada" etc.
    return { error: e instanceof Error ? e.message : 'No pude canjear.' };
  }

  revalidatePath('/recompensas');
  revalidatePath('/missoes');
  return { ok: true };
}
