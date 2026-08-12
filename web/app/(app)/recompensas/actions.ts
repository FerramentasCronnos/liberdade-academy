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
    if (!result) return { error: 'Sessão expirada. Entre novamente.' };
  } catch (e) {
    // a API devolve "Pontos insuficientes", "Recompensa esgotada" etc.
    return { error: e instanceof Error ? e.message : 'Não consegui resgatar.' };
  }

  revalidatePath('/recompensas');
  revalidatePath('/missoes');
  return { ok: true };
}
