'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logout } from '@/app/login/actions';
import { avatarColor, initials } from '@/lib/community';
import type { SessionUser } from '@/lib/session';
import { Avatar } from './avatar';
import { IconChevronDown, IconLogout, IconMedal, IconUser } from './icons';

/** Bloco de perfil fixo no rodapé da barra lateral, com menu de conta. */
export function SidebarProfile({
  user,
  collapsed,
  active,
}: {
  user: SessionUser | null;
  collapsed: boolean;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="mt-3 border-t border-white/12 pt-3">
        <Link
          href="/login"
          title={collapsed ? 'Entrar' : undefined}
          className={`flex items-center gap-3 rounded-2xl py-3 text-[14px] font-medium text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-white ${
            collapsed ? 'justify-center px-0' : 'px-4'
          }`}
        >
          <IconUser className="h-[19px] w-[19px] shrink-0" />
          {!collapsed && 'Entrar'}
        </Link>
      </div>
    );
  }

  const { tier } = user;
  const goal = tier.next?.min ?? tier.current.min;

  return (
    <div ref={ref} className="relative mt-3 border-t border-white/12 pt-3">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[262px] overflow-hidden rounded-2xl bg-[var(--bg-elevated)] shadow-[var(--shadow-lift)]">
          <div className="border-b border-[var(--border)] px-4 py-3.5">
            <p className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-[var(--text)]">
                {user.name}
              </span>
              <span className="shrink-0 rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                {tier.current.label}
              </span>
            </p>
            <p className="truncate text-[12px] text-[var(--text-muted)]">{user.email}</p>

            <p className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--brand)]">
              <IconMedal className="h-4 w-4" />
              {user.points.toLocaleString('pt-BR')} pontos
            </p>

            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-[width]"
                style={{ width: `${Math.round(tier.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 flex justify-between text-[10.5px] text-[var(--text-faint)]">
              <span>{tier.current.label}</span>
              <span>
                {user.points}/{goal}
              </span>
            </p>
          </div>

          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-[var(--text)] transition hover:bg-[var(--bg-sunken)]"
          >
            <IconUser className="h-[17px] w-[17px] text-[var(--text-muted)]" />
            Perfil
          </Link>

          <Link
            href={`/comunidade/membro/${user.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-[var(--text)] transition hover:bg-[var(--bg-sunken)]"
          >
            <IconMedal className="h-[17px] w-[17px] text-[var(--text-muted)]" />
            Perfil da Comunidade
          </Link>

          <form action={logout} className="border-t border-[var(--border)]">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <IconLogout className="h-[17px] w-[17px]" />
              Sair
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? user.name : undefined}
        className={`flex w-full items-center gap-3 rounded-2xl py-2.5 transition ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${
          active || open
            ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]'
            : 'text-white hover:bg-[var(--sidebar-hover)]'
        }`}
      >
        <Avatar
          name={user.name}
          src={user.avatar}
          size={36}
          color={avatarColor(user.name)}
          fallback={initials(user.name)}
        />

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13.5px] font-semibold leading-tight">
                {user.name}
              </span>
              <span
                className={`block truncate text-[11.5px] leading-tight ${
                  active || open ? 'text-[var(--text-muted)]' : 'text-white/55'
                }`}
              >
                {tier.current.label} · {user.points} pts
              </span>
            </span>
            <IconChevronDown
              className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>
    </div>
  );
}
