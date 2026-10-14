'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  setCreatorsAccessUntil,
  toggleCreatorsAccess,
  type CreatorsAccessState,
} from '@/app/(app)/admin/creators-actions';
import { IconCheck, IconSearch, IconX } from '../icons';

/**
 * Painel administrativo do acesso Creators (assinatura à parte, Stripe).
 *
 * A Stripe liga e desliga sozinha pelo webhook; aqui a equipe resolve exceções:
 * liberar um parceiro, cortar alguém ou ajustar o vencimento na mão.
 */
export interface CreatorsAccessMemberRow {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  creatorsAccess: boolean;
  creatorsAccessUntil?: string;
  stripeCustomerId?: string;
}

function isActive(member: CreatorsAccessMemberRow) {
  if (!member.creatorsAccess) return false;
  if (!member.creatorsAccessUntil) return true;
  return new Date(member.creatorsAccessUntil).getTime() > Date.now();
}

function formatDate(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-419', { day: '2-digit', month: 'short', year: 'numeric' });
}

function UntilForm({ member, onClose }: { member: CreatorsAccessMemberRow; onClose: () => void }) {
  const [state, action] = useActionState<CreatorsAccessState, FormData>(setCreatorsAccessUntil, {});
  const current = member.creatorsAccessUntil ? member.creatorsAccessUntil.slice(0, 10) : '';

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={member.id} />
      <input
        name="until"
        type="date"
        defaultValue={current}
        autoFocus
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[12px] font-semibold text-white"
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cancelar"
        className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-faint)] hover:bg-[var(--bg-sunken)]"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
      {state.ok && <IconCheck className="h-4 w-4 text-[var(--money)]" />}
      {state.error && <span className="text-[12px] text-[#d64545]">{state.error}</span>}
    </form>
  );
}

function Row({ member }: { member: CreatorsAccessMemberRow }) {
  const [editing, setEditing] = useState(false);
  const active = isActive(member);
  const until = formatDate(member.creatorsAccessUntil);
  const expired = member.creatorsAccess && !active;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[var(--text)]">
          {member.name}
          {member.isAdmin && (
            <span className="ml-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)]">
              Admin
            </span>
          )}
        </p>
        <p className="truncate text-[12.5px] text-[var(--text-muted)]">{member.email}</p>
        <p className="mt-0.5 text-[12px] text-[var(--text-faint)]">
          {member.isAdmin
            ? 'Acceso siempre (admin)'
            : active
              ? until
                ? `Acceso hasta ${until}`
                : 'Acceso sin vencimiento'
              : expired
                ? `Vencido el ${until ?? '—'}`
                : 'Sin acceso'}
          {member.stripeCustomerId && ' · Stripe'}
        </p>
      </div>

      {editing ? (
        <UntilForm member={member} onClose={() => setEditing(false)} />
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {member.creatorsAccess && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              Vencimiento
            </button>
          )}
          <form action={toggleCreatorsAccess} className="flex items-center gap-2">
            <input type="hidden" name="id" value={member.id} />
            {/* o valor enviado é o estado novo, não o atual */}
            {!active && <input type="hidden" name="enable" value="on" />}
            <button
              type="submit"
              role="switch"
              aria-checked={active}
              aria-label={`Acceso Creators para ${member.name}`}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                active ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  active ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
            <span className="hidden text-[12.5px] font-medium text-[var(--text-muted)] sm:inline">
              Acceso Creators
            </span>
          </form>
        </div>
      )}
    </li>
  );
}

export function CreatorsAccessPanel({ members }: { members: CreatorsAccessMemberRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  const activeCount = members.filter((m) => !m.isAdmin && isActive(m)).length;

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-[13.5px] text-[var(--text-muted)]">
          <strong className="font-semibold text-[var(--text)]">{activeCount}</strong>{' '}
          {activeCount === 1 ? 'miembro con' : 'miembros con'} acceso Creators (US$ 19/mes). Stripe lo
          activa y lo quita solo; aquí puedes liberar o cortar el acceso a mano.
        </p>
      </div>

      <label className="relative block">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o correo"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] py-2.5 pl-10 pr-3.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
        />
      </label>

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        {filtered.map((member) => (
          <Row key={member.id} member={member} />
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-[13.5px] text-[var(--text-muted)]">
            Ningún miembro coincide con la búsqueda.
          </li>
        )}
      </ul>
    </div>
  );
}
