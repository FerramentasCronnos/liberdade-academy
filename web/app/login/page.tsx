import { redirect } from 'next/navigation';
import { getToken } from '@/lib/session';
import { LoginForm } from './login-form';
import { Logo } from '@/components/logo';

export const metadata = { title: 'Entrar · Liberdade Academy' };

export default async function LoginPage() {
  if (await getToken()) redirect('/catalogo');

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel de marca */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[image:var(--sidebar-bg)] p-12 text-white lg:flex">
        <Logo onDark />

        <div className="max-w-md">
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-balance">
            O catálogo que transforma conteúdo em comissão.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Produtos virais validados, comunidade ativa e as ferramentas para você
            vender sem estoque e sem logística.
          </p>
        </div>

        <p className="text-[12.5px] text-white/45">
          © {new Date().getFullYear()} Liberdade Academy
        </p>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[var(--color-gold-400)]/15 blur-3xl"
        />
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <Logo />
          </div>

          <h2 className="mt-8 font-display text-[28px] font-semibold tracking-tight text-[var(--text)] lg:mt-0">
            Entrar
          </h2>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Use o e-mail cadastrado no curso.
          </p>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
