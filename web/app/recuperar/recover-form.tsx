'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { requestReset, resetPassword, type RecoverState, type ResetState } from './actions';

const field =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3.5 text-[15px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 w-full rounded-2xl bg-[var(--brand)] px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function RecoverForm() {
  const [state, formAction] = useActionState<RecoverState, FormData>(requestReset, {});

  if (state.done) {
    return (
      <div className="mt-7 rounded-2xl bg-[var(--money-soft)] px-4 py-4 text-[14px] leading-relaxed text-[var(--text)]">
        Si ese correo tiene una cuenta activa, te enviamos un enlace para crear una contraseña nueva. Revisa también
        la carpeta de spam. El enlace vale por 1 hora.
        <Link href="/login" className="mt-3 block text-[13.5px] font-semibold text-[var(--brand)] hover:underline">
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-7">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--text-muted)]">Correo de tu cuenta</span>
        <input name="email" type="email" autoComplete="email" required placeholder="tucorreo@email.com" className={field} />
      </label>
      {state.error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {state.error}
        </p>
      )}
      <Submit label="Enviarme el enlace" pendingLabel="Enviando…" />
      <Link href="/login" className="mt-4 block text-center text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
        Volver a entrar
      </Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetState, FormData>(resetPassword, {});

  return (
    <form action={formAction} className="mt-7">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--text-muted)]">Nueva contraseña</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={6} placeholder="Mínimo 6 caracteres" className={field} />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--text-muted)]">Repite la contraseña</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={6} placeholder="••••••••" className={field} />
      </label>
      {state.error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {state.error}
        </p>
      )}
      <Submit label="Guardar contraseña" pendingLabel="Guardando…" />
    </form>
  );
}
