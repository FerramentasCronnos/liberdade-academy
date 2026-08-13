'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './logo';
import { SidebarProfile } from './sidebar-profile';
import type { SessionUser } from '@/lib/session';
import {
  IconArchive,
  IconChart,
  IconGrid,
  IconLink,
  IconMedal,
  IconMessage,
  IconPages,
  IconIdCard,
  IconMegaphone,
  IconPanelLeft,
  IconSettings,
  IconTrophy,
} from './icons';

type Item = {
  href: string;
  label: string;
  icon: typeof IconGrid;
  /** Ainda sem backend — esmaecido, sem prometer o que não existe. */
  soon?: boolean;
};

const MAIN: Item[] = [
  { href: '/catalogo', label: 'Catálogo', icon: IconGrid },
  { href: '/comunidade', label: 'Comunidad', icon: IconMessage },
  { href: '/ranking', label: 'Ranking', icon: IconTrophy },
  { href: '/missoes', label: 'Misiones', icon: IconMedal },
  { href: '/recompensas', label: 'Recompensas', icon: IconArchive },
];

const TOOLS: Item[] = [
  { href: '/gerar-link', label: 'Generar Enlace', icon: IconLink },
  { href: '/analytics', label: 'Analytics', icon: IconChart, soon: true },
  { href: '/templates', label: 'Plantillas', icon: IconPages },
  { href: '/paginas/presell', label: 'Página de Presell', icon: IconMegaphone },
  { href: '/paginas/bio', label: 'Página para BIO', icon: IconIdCard },
  { href: '/anuncios', label: 'Baúl de Anuncios', icon: IconArchive },
  { href: '/credenciais', label: 'Credenciales', icon: IconSettings, soon: true },
];

const STORAGE_KEY = 'la-sidebar-collapsed';

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: Item;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center gap-3 rounded-2xl py-3 text-[14px] font-medium transition ${
        collapsed ? 'justify-center px-0' : 'px-4'
      } ${
        active
          ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)]'
          : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
      }`}
    >
      <Icon className="h-[19px] w-[19px] shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                active ? 'bg-[var(--violet-soft)]' : 'bg-white/12'
              }`}
            >
              breve
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // preferência só existe no cliente — lida depois da montagem
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // modo privado: segue expandida
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // sem persistência, mas a sessão atual funciona
      }
      return next;
    });
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col rounded-r-[32px] bg-[image:var(--sidebar-bg)] px-4 py-6 transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-[88px]' : 'w-[268px]'
      }`}
    >
      <div
        className={`flex items-center pb-8 ${collapsed ? 'justify-center' : 'justify-between px-2'}`}
      >
        {!collapsed && <Logo onDark />}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!collapsed}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <IconPanelLeft
            className={`h-[18px] w-[18px] transition ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* rolagem só na navegação: o perfil fica fixo no rodapé */}
      <div className="flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1">
          {MAIN.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {!collapsed ? (
          <p className="px-4 pb-2 pt-7 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
            Herramientas
          </p>
        ) : (
          <div className="my-4 h-px bg-white/12" />
        )}

        <nav className="flex flex-col gap-1">
          {TOOLS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      <SidebarProfile user={user} collapsed={collapsed} active={isActive('/perfil')} />
    </aside>
  );
}
