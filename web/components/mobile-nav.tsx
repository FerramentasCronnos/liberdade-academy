'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconGrid, IconMessage, IconTrophy, IconUser } from './icons';

/** Barra inferior no celular — a sidebar some abaixo de lg. */
const ITEMS = [
  { href: '/catalogo', label: 'Catálogo', icon: IconGrid },
  { href: '/comunidade', label: 'Comunidad', icon: IconMessage },
  { href: '/ranking', label: 'Ranking', icon: IconTrophy },
  { href: '/perfil', label: 'Perfil', icon: IconUser },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--bg-elevated)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition ${
              active ? 'text-[var(--brand)]' : 'text-[var(--text-faint)]'
            }`}
          >
            <Icon className="h-[21px] w-[21px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
