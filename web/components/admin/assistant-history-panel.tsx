'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AssistantConversation, AssistantHistoryMessage, AssistantStats, AssistantTicketReply } from '@/lib/assistant-history';
import { avatarColor, initials, relativeTime, ticketCategory, TICKET_STATUS } from '@/lib/community';
import { Avatar } from '@/components/avatar';
import { IconChevronDown, IconExternal, IconSearch } from '@/components/icons';

/**
 * Histórico da IA de suporte no admin: o que Sofía e Mateo responderam no
 * widget e nos tickets. Cartões fechados mostram só a primeira pergunta;
 * abertos, a conversa inteira. Filtro e busca são locais: a lista já vem
 * carregada do servidor.
 */
const AGENT_LABEL: Record<string, string> = { general: '🛟 Sofía', trafico: '🚀 Mateo' };

type Filter = 'todos' | 'general' | 'trafico' | 'escalados';

/** Uma linha única para widget e tickets: a lista mistura as duas origens por data. */
interface Entry {
  key: string;
  kind: 'widget' | 'ticket';
  assistant: string;
  agent: string;
  escalated: boolean;
  date: string;
  user: { name: string; email: string; avatar?: string };
  preview: string;
  messages: AssistantHistoryMessage[];
  ticket?: { id: string; subject: string; category: string; status: string };
}

function toEntries(conversations: AssistantConversation[], ticketReplies: AssistantTicketReply[]): Entry[] {
  const widget: Entry[] = conversations.map((c) => {
    const first = c.messages.find((m) => m.role === 'user');
    return {
      key: `w-${c.id}`,
      kind: 'widget',
      assistant: c.assistant,
      agent: c.agent,
      escalated: c.escalated,
      date: c.updatedAt,
      user: c.user,
      preview: first?.content || (first?.attachments.length ? 'Envió una captura' : 'Sin mensajes'),
      messages: c.messages,
    };
  });
  const tickets: Entry[] = ticketReplies.map((t) => ({
    key: `t-${t.ticketId}`,
    kind: 'ticket',
    assistant: t.assistant,
    agent: t.agent,
    escalated: t.escalated,
    date: t.lastMessageAt,
    user: t.user,
    preview: t.exchanges[0]?.question?.content || t.subject,
    messages: t.exchanges.flatMap((e) => (e.question ? [e.question, e.answer] : [e.answer])),
    ticket: { id: t.ticketId, subject: t.subject, category: t.category, status: t.status },
  }));
  return [...widget, ...tickets].sort((a, b) => b.date.localeCompare(a.date));
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-soft)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">{label}</p>
      <p className="mt-0.5 font-display text-[24px] font-semibold tabular-nums text-[var(--text)]">{value}</p>
      <p className="text-[11.5px] text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function Bubble({ m, agent }: { m: AssistantHistoryMessage; agent: string }) {
  const fromAssistant = m.role === 'assistant';
  return (
    <li className={`flex ${fromAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed sm:max-w-[80%] ${fromAssistant ? 'bg-[var(--violet-soft)] text-[var(--text)]' : 'bg-[var(--bg-sunken)] text-[var(--text)]'}`}>
        <p className="mb-0.5 text-[11px] font-semibold text-[var(--text-faint)]">
          {fromAssistant ? agent : 'Miembro'} · {new Date(m.createdAt).toLocaleString('es-419', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
        {m.attachments.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {m.attachments.map((u, i) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] px-2 py-1 text-[12px] font-semibold text-[var(--brand)] hover:underline">
                  Adjunto {i + 1} <IconExternal className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Card({ e }: { e: Entry }) {
  const [open, setOpen] = useState(false);
  const status = e.ticket ? TICKET_STATUS[e.ticket.status] ?? TICKET_STATUS.abierto : null;
  return (
    <li className="rounded-[18px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <Avatar name={e.user.name} src={e.user.avatar} size={34} color={avatarColor(e.user.name)} fallback={initials(e.user.name)} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] font-semibold text-[var(--text)]">
            <span className="truncate">{e.user.name}</span>
            <span className="truncate text-[12px] font-normal text-[var(--text-faint)]">{e.user.email}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
            <span className="rounded-full bg-[var(--violet-soft)] px-2 py-0.5 font-semibold text-[var(--brand)]">{AGENT_LABEL[e.assistant] ?? e.agent}</span>
            <span className="rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 font-semibold">{e.kind === 'ticket' ? 'Ticket' : 'Widget'}</span>
            {e.escalated && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">Escalado</span>}
            {status && <span className={`rounded-full px-2 py-0.5 font-semibold ${status.className}`}>{status.label}</span>}
            <span>{relativeTime(e.date)} · {e.messages.length} msg</span>
          </p>
          {!open && <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--text-muted)]">{e.ticket ? `${e.ticket.subject} — ` : ''}{e.preview}</p>}
        </div>
        <IconChevronDown className={`mt-2 h-4 w-4 shrink-0 text-[var(--text-faint)] transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {e.ticket && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-[var(--text)]">
                {ticketCategory(e.ticket.category).emoji} {e.ticket.subject}
              </p>
              <Link href={`/comunidade/soporte/${e.ticket.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--brand)] hover:underline">
                Ver ticket <IconExternal className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {e.messages.map((m, i) => <Bubble key={`${m.createdAt}-${i}`} m={m} agent={e.agent} />)}
          </ul>
        </div>
      )}
    </li>
  );
}

export function AssistantHistoryPanel({ conversations, ticketReplies, stats }: { conversations: AssistantConversation[]; ticketReplies: AssistantTicketReply[]; stats: AssistantStats }) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [q, setQ] = useState('');

  const entries = useMemo(() => toEntries(conversations, ticketReplies), [conversations, ticketReplies]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === 'escalados' && !e.escalated) return false;
      if ((filter === 'general' || filter === 'trafico') && e.assistant !== filter) return false;
      if (!needle) return true;
      return (
        e.user.name.toLowerCase().includes(needle) ||
        e.user.email.toLowerCase().includes(needle) ||
        (e.ticket?.subject.toLowerCase().includes(needle) ?? false) ||
        e.messages.some((m) => m.content.toLowerCase().includes(needle))
      );
    });
  }, [entries, filter, q]);

  const chips: Array<{ id: Filter; label: string }> = [
    { id: 'todos', label: 'Todos' },
    { id: 'general', label: '🛟 Sofía' },
    { id: 'trafico', label: '🚀 Mateo' },
    { id: 'escalados', label: 'Escalados' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Conversaciones" value={stats.last7.conversations} hint={`7 días · ${stats.last30.conversations} en 30 días`} />
        <Stat label="Escaladas" value={stats.last7.escalated} hint={`7 días · ${stats.last30.escalated} en 30 días`} />
        <Stat label="Tickets respondidos" value={stats.last7.ticketReplies} hint={`7 días · ${stats.last30.ticketReplies} en 30 días`} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${filter === c.id ? 'bg-[var(--text)] text-[var(--bg-elevated)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft)] hover:text-[var(--text)]'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por miembro, correo o texto…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-9 pr-4 text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[13.5px] text-[var(--text-muted)]">
          {entries.length === 0 ? 'Todavía no hay conversaciones con la IA de soporte.' : 'Nada coincide con ese filtro.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((e) => <Card key={e.key} e={e} />)}
        </ul>
      )}
    </div>
  );
}
