'use server';

import { revalidatePath } from 'next/cache';
import { DomainError, redeemReward as redeem } from '@/lib/mutations';
import { getUserId } from '@/lib/session';

export type RedeemState = { error?: string; ok?: boolean };

export async function redeemReward(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const userId = await getUserId();
  if (!userId) return { error: 'Sesión expirada. Inicia sesión de nuevo.' };

  const rewardId = String(formData.get('rewardId') || '');
  if (!rewardId) return { error: 'Recompensa inválida.' };

  try {
    await redeem(userId, rewardId);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No pude canjear.' };
  }

  revalidatePath('/recompensas');
  revalidatePath('/missoes');
  return { ok: true };
}
