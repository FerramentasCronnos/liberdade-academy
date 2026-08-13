'use client';

/* eslint-disable @next/next/no-img-element */

import { useActionState, useRef, useState } from 'react';
import { setRewardImage, type AdminState } from '@/app/(app)/admin/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { formatPoints, type Reward } from '@/lib/gamification';
import { RewardArt } from '../reward-art';
import { IconCheck, IconUpload, IconX } from '../icons';

function RewardRow({ reward }: { reward: Reward }) {
  const [state, action] = useActionState<AdminState, FormData>(setRewardImage, {});
  const [image, setImage] = useState(reward.image ?? '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onPick = async (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);
    setUploading(false);

    if (result.url) {
      setImage(result.url);
      // salva assim que a imagem sobe, sem exigir um segundo clique
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-sunken)]">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <RewardArt slug={reward.slug} className="h-full w-full" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[var(--text)]">{reward.title}</p>
        <p className="text-[12px] text-[var(--text-faint)]">
          {formatPoints(reward.costPoints)} pts
          {!image && ' · sin foto, usando arte generada'}
        </p>
      </div>

      <form ref={formRef} action={action} className="flex shrink-0 items-center gap-2">
        <input type="hidden" name="id" value={reward.id} />
        <input type="hidden" name="image" value={image} />

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPick(file);
          }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:opacity-60"
        >
          <IconUpload className="h-3.5 w-3.5" />
          {uploading ? 'Subiendo…' : image ? 'Cambiar' : 'Subir foto'}
        </button>

        {image && (
          <button
            type="button"
            onClick={() => {
              setImage('');
              requestAnimationFrame(() => formRef.current?.requestSubmit());
            }}
            aria-label="Quitar foto"
            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        )}

        {state.ok && <IconCheck className="h-4 w-4 text-[var(--money)]" />}
      </form>
    </li>
  );
}

export function RewardsPanel({ rewards }: { rewards: Reward[] }) {
  const withPhoto = rewards.filter((r) => r.image).length;

  return (
    <>
      <div className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-[16px] font-semibold text-[var(--text)]">
          Fotos de las recompensas
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          Sube la foto real de cada premio. Varios son productos de marca propia — copo, buzo,
          mochila — y una foto de banco de imágenes mostraría un producto que no es el de ustedes.
          Mientras no haya foto, la tarjeta usa una arte generada.
        </p>
        <p className="mt-2 text-[12px] font-semibold text-[var(--brand)]">
          {withPhoto} de {rewards.length} con foto
        </p>
      </div>

      <ul className="mt-4 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
        {rewards.map((reward) => (
          <RewardRow key={reward.id} reward={reward} />
        ))}
      </ul>
    </>
  );
}
