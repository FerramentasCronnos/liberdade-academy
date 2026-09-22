'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { spaceColor, type Space } from '@/lib/community';

/**
 * Barra lateral da comunidade, como no Circle: "Feed" no topo e os espaços
 * agrupados, cada um com sua bolinha de cor. No celular vira chips roláveis.
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

  const community = spaces.filter((s) => s.kind !== 'chat');
  const support = spaces.filter((s) => s.kind === 'chat');

  const item = (href: string, label: string, opts: { dot?: string; icon?: string; badge?: number } = {}) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition ${
        active(href)
          ? 'bg-[var(--bg-sunken)] font-semibold text-[var(--text)]'
          : 'font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sunken)]/70 hover:text-[var(--text)]'
      }`}
    >
      {opts.dot ? (
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: opts.dot }} aria-hidden />
      ) : (
        <span className="w-3 shrink-0 text-center text-[13px]" aria-hidden>{opts.icon}</span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {opts.badge ? (
        <span className="rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">{opts.badge}</span>
      ) : null}
    </Link>
  );

  const group = (title: string) => (
    <p className="px-3 pb-1.5 pt-5 text-[13px] font-semibold text-[var(--text)]">{title}</p>
  );

  const supportLabel = isAdmin ? 'Tickets' : 'Mis tickets';

  return (
    <div className="flex min-h-[calc(100dvh-0px)]">
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-5 lg:block">
        <nav>
          {item('/comunidade', 'Feed', { icon: '☰' })}
          {group('Comunidad')}
          {community.map((s) => item(`/comunidade/e/${s.slug}`, s.name, { dot: spaceColor(s.slug).dot }))}
          {group('Soporte')}
          {support.map((s) => item(`/comunidade/e/${s.slug}`, s.name, { dot: spaceColor(s.slug).dot }))}
          {item('/comunidade/soporte', supportLabel, { icon: '🎧', badge: openTickets })}
          {group('Personas')}
          {item('/comunidade/miembros', 'Miembros', { icon: '👥' })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 lg:hidden [scrollbar-width:none]">
          {[
            { href: '/comunidade', label: 'Feed' },
            ...spaces.map((s) => ({ href: `/comunidade/e/${s.slug}`, label: s.name, dot: spaceColor(s.slug).dot })),
            { href: '/comunidade/soporte', label: supportLabel },
            { href: '/comunidade/miembros', label: 'Miembros' },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
                active(c.href) ? 'bg-[var(--text)] text-[var(--bg-elevated)]' : 'bg-[var(--bg-sunken)] text-[var(--text-muted)]'
              }`}
            >
              {'dot' in c && c.dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.dot }} />}
              {c.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
