'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createMember,
  deleteMember,
  resetPassword,
  toggleAdmin,
  type AdminState,
} from '@/app/(app)/admin/actions';
import { avatarColor, initials } from '@/lib/community';
import { IconCheck, IconX } from '../icons';

export interface Member {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  plan: string;
  createdAt: string;
}

const input =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ResetForm({ member }: { member: Member }) {
  const [state, action] = useActionState<AdminState, FormData>(resetPassword, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]"
      >
        Contraseña
      </button>
    );
  }

  return (
    <form action={action} className="flex shrink-0 items-center gap-1.5">
      <input type="hidden" name="id" value={member.id} />
      <input
        name="password"
        type="text"
        placeholder="Nueva contraseña"
        autoFocus
        className="w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[12px] font-semibold text-white"
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cancelar"
        className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-faint)] hover:bg-[var(--bg-sunken)]"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
      {state.ok && <IconCheck className="h-4 w-4 text-[var(--money)]" />}
      {state.error && <span className="text-[11px] text-red-600">{state.error}</span>}
    </form>
  );
}

export function MembersPanel({ members, meId }: { members: Member[]; meId: string }) {
  const [state, action] = useActionState<AdminState, FormData>(createMember, {});

  return (
    <>
      <form
        action={action}
        className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]"
      >
        <h2 className="font-display text-[16px] font-semibold text-[var(--text)]">
          Agregar miembro
        </h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          Acceso manual. Cuando integremos el checkout, esto pasa a ser automático.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input name="name" placeholder="Nombre" className={input} />
          <input name="email" type="email" placeholder="correo@ejemplo.com" className={input} />
          <input name="password" placeholder="Contraseña" className={input} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
            <input
              type="checkbox"
              name="isAdmin"
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Dar acceso de administrador
          </label>

          <div className="ml-auto">
            <Submit label="Agregar" pendingLabel="Agregando…" />
          </div>
        </div>

        {state.error && (
          <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--money)]">
            <IconCheck className="h-4 w-4" />
            {state.ok}
          </p>
        )}
      </form>

      <h2 className="mt-6 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
        Miembros ({members.length})
      </h2>

      <ul className="mt-3 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
        {members.map((member) => {
          const isMe = member.id === meId;
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-3 py-3.5">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: avatarColor(member.name) }}
              >
                {initials(member.name)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-medium text-[var(--text)]">
                  <span className="truncate">{member.name}</span>
                  {member.isAdmin && (
                    <span className="shrink-0 rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                      Admin
                    </span>
                  )}
                  {isMe && (
                    <span className="shrink-0 text-[10.5px] text-[var(--text-faint)]">tú</span>
                  )}
                </p>
                <p className="truncate text-[12px] text-[var(--text-faint)]">{member.email}</p>
              </div>

              <ResetForm member={member} />

              {/* a própria conta não pode perder admin nem se apagar */}
              {!isMe && (
                <>
                  <form action={toggleAdmin}>
                    <input type="hidden" name="id" value={member.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]"
                    >
                      {member.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                  </form>

                  <form action={deleteMember}>
                    <input type="hidden" name="id" value={member.id} />
                    <button
                      type="submit"
                      aria-label={`Eliminar ${member.email}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </form>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
