'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, type LoginState } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 w-full rounded-2xl bg-[var(--brand)] px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

const field =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3.5 text-[15px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-7">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--text-muted)]">
          Correo
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tucorreo@email.com"
          className={field}
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--text-muted)]">
          Contraseña
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={field}
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
