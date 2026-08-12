'use client';

/* eslint-disable @next/next/no-img-element */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { redeemReward, type RedeemState } from '@/app/(app)/recompensas/actions';
import { formatPoints, type Reward } from '@/lib/gamification';
import { IconGift } from './icons';

function RedeemButton({ reward }: { reward: Reward }) {
  const { pending } = useFormStatus();
  const blocked = reward.soldOut || !reward.affordable;

  return (
    <button
      type="submit"
      disabled={pending || blocked}
      className={`w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold transition ${
        blocked
          ? 'cursor-not-allowed bg-[var(--bg-sunken)] text-[var(--text-faint)]'
          : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
      }`}
    >
      {pending
        ? 'Resgatando…'
        : reward.soldOut
          ? 'Esgotado'
          : reward.affordable
            ? 'Resgatar'
            : 'Pontos insuficientes'}
    </button>
  );
}

export function RewardCard({ reward }: { reward: Reward }) {
  const [state, formAction] = useActionState<RedeemState, FormData>(redeemReward, {});

  return (
    <article className="flex flex-col overflow-hidden rounded-[22px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
      <div className="relative m-2 grid aspect-[4/3] place-items-center overflow-hidden rounded-[16px] bg-[var(--violet-soft)]">
        {reward.image ? (
          <img src={reward.image} alt={reward.title} className="h-full w-full object-cover" />
        ) : (
          <IconGift className="h-12 w-12 text-[var(--brand)] opacity-40" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-1">
        <h3 className="text-[14px] font-semibold leading-snug text-[var(--text)]">
          {reward.title}
        </h3>
        {reward.description && (
          <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            {reward.description}
          </p>
        )}

        <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1 text-[12px] font-bold text-white">
          {formatPoints(reward.costPoints)} pts
        </span>

        {reward.stock != null && !reward.soldOut && (
          <p className="text-[11.5px] text-[var(--text-faint)]">
            {reward.stock} {reward.stock === 1 ? 'unidade' : 'unidades'} em estoque
          </p>
        )}

        <form action={formAction} className="mt-1">
          <input type="hidden" name="rewardId" value={reward.id} />
          <RedeemButton reward={reward} />
        </form>

        {state.error && (
          <p role="alert" className="text-[12px] font-medium text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-[12px] font-medium text-[var(--money)]">
            Resgate solicitado! Acompanhe em Meus resgates.
          </p>
        )}
      </div>
    </article>
  );
}
