import Link from 'next/link';
import { Logo } from '@/components/logo';
import { verifyResetToken } from '@/lib/password-reset';
import { ResetForm } from '../recover-form';

export const metadata = { title: 'Nueva contraseña · MVA' };

type Params = Promise<{ token: string }>;

/** Tela do link do e-mail: valida o token e deixa criar a senha nova. */
export default async function ResetPage({ params }: { params: Params }) {
  const { token } = await params;
  const valid = await verifyResetToken(token);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-6 py-12">
      <div className="w-full max-w-[380px]">
        <Logo />
        {valid ? (
          <>
            <h1 className="mt-8 font-display text-[28px] font-semibold tracking-tight text-[var(--text)]">Crea tu nueva contraseña</h1>
            <p className="mt-1 text-[14px] text-[var(--text-muted)]">Después de guardarla, entra con ella normalmente.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-[28px] font-semibold tracking-tight text-[var(--text)]">Este enlace ya no sirve</h1>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
              Venció (vale 1 hora) o ya fue usado. Pide uno nuevo y usa el correo más reciente.
            </p>
            <Link
              href="/recuperar"
              className="mt-6 inline-block rounded-2xl bg-[var(--brand)] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
            >
              Pedir un enlace nuevo
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
