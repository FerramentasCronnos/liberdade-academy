'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addGroup,
  removeGroup,
  saveRotation,
  type GroupState,
} from '@/app/(app)/paginas/actions';
import type { LandingPage } from '@/lib/pages';
import { IconX } from '../icons';

const input =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

const label = 'mb-1.5 block text-[12.5px] font-semibold text-[var(--text)]';

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Agregando…' : '+ Adicionar'}
    </button>
  );
}

export function PresellGroups({ page }: { page: LandingPage }) {
  const [state, formAction] = useActionState<GroupState, FormData>(addGroup, {});
  const groups = page.groups ?? [];

  const nextInQueue = page.rotationAuto
    ? groups.find((g) => {
        const limit = g.clickLimit ?? page.defaultClickLimit;
        return g.active && (limit == null || g.clicks < limit);
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--violet-soft)] px-4 py-3">
        <p className="text-[13.5px] font-semibold text-[var(--brand)]">
          Cambios aplicados en tiempo real
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          Los cambios en grupos, límites de clics y modo de rotación se aplican de inmediato
          para quien abra el enlace publicado. No hace falta republicar la página.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">Distribución de clics</h3>

        <form action={saveRotation} className="mt-3">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="rotationAuto" value={String(!page.rotationAuto)} />
          <input
            type="hidden"
            name="defaultClickLimit"
            value={page.defaultClickLimit ?? ''}
          />

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-[var(--text)]">
                Rotación automática al alcanzar el límite
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Envía todos los clics al primer grupo activo hasta que alcance el límite;
                luego pasa al siguiente. Apagado, reparte parejo entre los grupos.
              </p>
            </div>
            <button
              type="submit"
              role="switch"
              aria-checked={page.rotationAuto}
              aria-label="Alternar rotación automática"
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                page.rotationAuto ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                  page.rotationAuto ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </form>

        <form action={saveRotation} className="mt-3">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="rotationAuto" value={String(page.rotationAuto)} />

          <label className={label}>Límite estándar de clics por grupo</label>
          <div className="flex gap-2">
            <input
              name="defaultClickLimit"
              type="number"
              min={1}
              defaultValue={page.defaultClickLimit ?? ''}
              placeholder="Sin límite"
              className={input}
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl border border-[var(--border)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
            >
              Guardar
            </button>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">
            Cuántos clics antes de pasar al siguiente grupo. Se usa cuando el grupo no tiene
            límite propio. Déjalo vacío para no limitar.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">Agregar grupo</h3>

        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="pageId" value={page.id} />

          <div className="min-w-[140px] flex-1">
            <label className={label}>Nombre interno</label>
            <input name="name" placeholder={`Grupo #${groups.length + 1}`} className={input} />
          </div>

          <div className="min-w-[220px] flex-[2]">
            <label className={label}>Enlace de invitación de WhatsApp</label>
            <input name="inviteUrl" placeholder="https://chat.whatsapp.com/..." className={input} />
          </div>

          <div className="min-w-[120px] flex-1">
            <label className={label}>Límite de clics</label>
            <input name="clickLimit" type="number" min={1} placeholder="Sin límite" className={input} />
          </div>

          <AddButton />
        </form>

        {state.error && (
          <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">
          Grupos configurados ({groups.length})
        </h3>

        <p className="mt-2 rounded-xl bg-[var(--bg-sunken)] px-3.5 py-2 text-[12px] text-[var(--text-muted)]">
          Modo: <strong>{page.rotationAuto ? 'Automático' : 'Distribuido'}</strong> · Límite
          estándar: <strong>{page.defaultClickLimit ?? 'sin límite'}</strong> · Siguiente en la fila:{' '}
          <strong>{nextInQueue?.name ?? '—'}</strong>
        </p>

        {groups.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--border-strong)] py-10 text-center text-[13px] text-[var(--text-muted)]">
            Ningún grupo registrado. Agrega al menos uno para que el botón funcione.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {groups.map((group) => {
              const limit = group.clickLimit ?? page.defaultClickLimit;
              const full = limit != null && group.clicks >= limit;
              return (
                <li key={group.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[14px] font-medium text-[var(--text)]">
                      {group.name}
                      {full && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                          en el límite
                        </span>
                      )}
                      {nextInQueue?.id === group.id && (
                        <span className="rounded-full bg-[var(--money-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--money)]">
                          recibiendo
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[12px] text-[var(--text-faint)]">
                      {group.clicks} {group.clicks === 1 ? 'clique' : 'cliques'}
                      {limit != null ? ` de ${limit}` : ''} · {group.inviteUrl}
                    </p>
                  </div>

                  <form action={removeGroup}>
                    <input type="hidden" name="pageId" value={page.id} />
                    <input type="hidden" name="groupId" value={group.id} />
                    <button
                      type="submit"
                      aria-label={`Remover ${group.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
