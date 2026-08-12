'use client';

/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitMission, type SubmitState } from '@/app/(app)/missoes/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { MISSION_CATEGORIES, type Mission } from '@/lib/gamification';
import { IconCheck, IconUpload, IconX } from './icons';

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Enviando…' : 'Enviar comprovação'}
    </button>
  );
}

export function MissionCard({ mission }: { mission: Mission }) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState<SubmitState, FormData>(submitMission, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setProof(null);
    }
  }, [state.ok]);

  const onPickFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);

    if (result.error) setUploadError(result.error);
    else setProof(result.url ?? null);

    setUploading(false);
  };

  const done = mission.status === 'approved' && mission.locked;
  const pending = mission.status === 'pending';

  return (
    <>
      <article
        className={`flex flex-col rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)] transition ${
          done ? 'opacity-70' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-[var(--brand)] px-2.5 py-1 text-[11px] font-bold text-white">
            +{mission.points} pts
          </span>
          <span className="rounded-full bg-[var(--bg-sunken)] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
            {MISSION_CATEGORIES[mission.category] ?? mission.category}
          </span>
        </div>

        <h3 className="mt-3 font-display text-[16px] font-semibold leading-snug text-[var(--text)]">
          {mission.title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
          {mission.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {mission.kind === 'automatic' && (
            <span className="rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
              Automática
            </span>
          )}
          {mission.kind === 'proof' && (
            <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-faint)]">
              Comprovação
            </span>
          )}
          {mission.repeatable && (
            <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-faint)]">
              Repetível
            </span>
          )}
        </div>

        <div className="mt-4">
          {done ? (
            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--money)]">
              <IconCheck className="h-4 w-4" />
              Concluída
            </p>
          ) : pending ? (
            <p className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">
              Em análise
            </p>
          ) : mission.kind === 'automatic' ? (
            <p className="text-[12.5px] text-[var(--text-faint)]">
              Creditada automaticamente ao completar.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
            >
              Enviar comprovação
            </button>
          )}
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[18px] font-semibold text-[var(--text)]">
                {mission.title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-sunken)]"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-[13px] text-[var(--text-muted)]">{mission.description}</p>

            <form action={formAction} className="mt-4">
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="proofUrl" value={proof ?? ''} />

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onPickFile(file);
                }}
              />

              {proof ? (
                <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
                  <img src={proof} alt="Comprovação" className="max-h-[240px] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setProof(null)}
                    aria-label="Remover print"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] py-8 text-[13px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60"
                >
                  <IconUpload className="h-5 w-5" />
                  {uploading ? 'Enviando…' : 'Escolher print'}
                </button>
              )}

              <textarea
                name="note"
                rows={2}
                maxLength={500}
                placeholder="Quer explicar algo? (opcional)"
                className="mt-3 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
              />

              {(state.error || uploadError) && (
                <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
                  {state.error || uploadError}
                </p>
              )}

              <div className="mt-4">
                <Submit disabled={uploading || !proof} />
              </div>

              <p className="mt-2 text-center text-[11.5px] text-[var(--text-faint)]">
                Os pontos entram depois da revisão.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
