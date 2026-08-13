'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from './icons';

const STORAGE_KEY = 'la-theme';

/**
 * Script inline que roda antes da pintura, evitando o flash de tema claro em
 * quem escolheu escuro. Vai no <head> via dangerouslySetInnerHTML.
 */
export const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export function ThemeToggle() {
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
      // modo privado: só não persiste
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
    >
      {/* antes de montar não sabemos o tema: renderiza a lua, sem piscar */}
      {mounted && dark ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
    </button>
  );
}
