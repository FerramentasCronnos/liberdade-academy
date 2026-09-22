'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Space } from '@/lib/community';
import { IconMessage, IconUser } from '@/components/icons';

/**
 * Coluna de espaços da comunidade, no espírito do Circle: grupos de espaços
 * à esquerda, conteúdo à direita. No celular vira uma fila de chips rolável.
 */
export function CommunityShell({
  spaces,
  isAdmin,
  openTickets,
  children,
}: {
  spaces: Space[];
  isAdmin: boolean;
  openTickets: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === '/comunidade' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const link = (href: string, label: React.ReactNode, badge?: React.ReactNode) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${
        active(href)
          ? 'bg-[var(--violet-soft)] text-[var(--brand)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]'
      }`}
    >
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </Link>
  );

  const group = (title: string) => (
    <p className="px-3 pb-1 pt-4 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--text-faint)]">
      {title}
    </p>
  );

  const supportLabel = isAdmin ? 'Tickets' : 'Mi soporte';
  const supportBadge =
    openTickets > 0 ? (
      <span className="rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">
        {openTickets}
      </span>
    ) : undefined;

  return (
    <div className="mx-auto flex max-w-[1120px] gap-6 px-5 pb-12 pt-2 sm:px-8">
      <aside className="sticky top-6 hidden w-[232px] shrink-0 self-start lg:block">
        <nav className="rounded-[22px] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-soft)]">
          {link(
            '/comunidade',
            <span className="inline-flex items-center gap-2">
              <IconMessage className="h-4 w-4" /> Inicio
            </span>,
          )}
          {group('Espacios')}
          {spaces.map((s) =>
            link(
              `/comunidade/e/${s.slug}`,
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>{s.emoji}</span> {s.name}
              </span>,
              <span className="text-[11px] text-[var(--text-faint)]">{s.postCount}</span>,
            ),
          )}
          {group('Ayuda')}
          {link('/comunidade/soporte', <span>🎧 {supportLabel}</span>, supportBadge)}
          {group('Personas')}
          {link(
            '/comunidade/miembros',
            <span className="inline-flex items-center gap-2">
              <IconUser className="h-4 w-4" /> Miembros
            </span>,
          )}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:hidden [scrollbar-width:none]">
          {[
            { href: '/comunidade', label: 'Inicio' },
            ...spaces.map((s) => ({ href: `/comunidade/e/${s.slug}`, label: `${s.emoji} ${s.name}` })),
            { href: '/comunidade/soporte', label: `🎧 ${supportLabel}` },
            { href: '/comunidade/miembros', label: 'Miembros' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                active(item.href)
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
