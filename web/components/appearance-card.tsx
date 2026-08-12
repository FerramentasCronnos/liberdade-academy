'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from './icons';

const STORAGE_KEY = 'la-theme';

/** Mesmo controle do cabeçalho, em formato de cartão para a tela de Perfil. */
export function AppearanceCard() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // modo privado: vale só nesta sessão
    }
  };

  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-[18px] font-semibold text-[var(--text)]">Aparência</h2>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--violet-soft)] text-[var(--brand)]">
          {mounted && dark ? (
            <IconMoon className="h-[18px] w-[18px]" />
          ) : (
            <IconSun className="h-[18px] w-[18px]" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-[var(--text)]">
            {mounted && dark ? 'Tema escuro' : 'Tema claro'}
          </p>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            Alterar a aparência da aplicação
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Alternar tema escuro"
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            dark ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
              dark ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>
    </section>
  );
}
