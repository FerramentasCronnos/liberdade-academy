import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { getUserId } from '@/lib/session';
import { RecoverForm } from './recover-form';

export const metadata = { title: 'Recuperar contraseña · MVA' };

/** Pede o e-mail e manda o link de troca de senha (só contas com acesso vigente). */
export default async function RecoverPage() {
  if (await getUserId()) redirect('/perfil');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-6 py-12">
      <div className="w-full max-w-[380px]">
        <Logo />
        <h1 className="mt-8 font-display text-[28px] font-semibold tracking-tight text-[var(--text)]">¿Olvidaste tu contraseña?</h1>
        <p className="mt-1 text-[14px] text-[var(--text-muted)]">
          Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva.
        </p>
        <RecoverForm />
      </div>
    </main>
  );
}
