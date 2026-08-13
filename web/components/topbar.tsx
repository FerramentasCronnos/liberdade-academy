'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { IconBell, IconChevronDown, IconExternal } from './icons';

const NAV = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/comunidade', label: 'Comunidad' },
  { href: '/missoes', label: 'Misiones' },
  { href: '/recompensas', label: 'Recompensas' },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[var(--border)] bg-[var(--bg-elevated)]/85 backdrop-blur-xl">
      <div className="flex h-full items-center gap-4 px-4 sm:px-6">
        <Link href="/catalogo" className="shrink-0">
          <Logo />
        </Link>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                  active
                    ? 'bg-[var(--brand-soft)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <a
            href="https://mecanismodevendasautomaticas.com.br"
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2 text-[14px] font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--brand-hover)]"
          >
            Área de miembros
            <IconExternal className="h-3.5 w-3.5" />
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            type="button"
            aria-label="Notificaciones"
            className="relative grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
          >
            <IconBell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          </button>

          <ThemeToggle />

          <button
            type="button"
            className="ml-1 flex items-center gap-1 rounded-full py-1 pl-1 pr-2 transition hover:bg-[var(--bg-sunken)]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-soft)] text-[13px] font-semibold text-[var(--accent-text)]">
              T
            </span>
            <IconChevronDown className="h-4 w-4 text-[var(--text-faint)]" />
          </button>
        </div>
      </div>
    </header>
  );
}
