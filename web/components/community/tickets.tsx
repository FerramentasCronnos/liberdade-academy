'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { answerTicket, changeTicketStatus, openTicket, type FormState } from '@/app/(app)/comunidade/actions';
import { avatarColor, initials, relativeTime, TICKET_STATUS, type TicketDetail, type TicketSummary } from '@/lib/community';
import { Avatar } from '@/components/avatar';
import { TeamBadge } from '@/components/post-card';

const input =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60">
      {pending ? 'Enviando…' : label}
    </button>
  );
}

export function StatusChip({ status }: { status: string }) {
  const s = TICKET_STATUS[status] ?? TICKET_STATUS.abierto;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${s.className}`}>{s.label}</span>;
}

/** Formulário de abertura, recolhido até clicar. */
export function NewTicket() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(openTicket, {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]">
        Nuevo ticket
      </button>
    );
  }

  return (
    <form action={action} className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[17px] font-semibold text-[var(--text)]">¿En qué te ayudamos?</h3>
      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">Solo tú y el equipo ven esta conversación.</p>
      <div className="mt-4 flex flex-col gap-3">
        <input name="subject" maxLength={120} placeholder="Asunto (ej.: no puedo generar mi enlace)" className={input} autoFocus />
        <textarea name="content" rows={5} maxLength={4000} placeholder="Cuéntanos qué pasó, qué esperabas y, si puedes, desde qué dispositivo." className={`${input} resize-none`} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Submit label="Abrir ticket" />
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-medium text-[var(--text-muted)]">Cancelar</button>
        {state.error && <p role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{state.error}</p>}
      </div>
    </form>
  );
}

export function TicketList({ tickets, forSupport }: { tickets: TicketSummary[]; forSupport: boolean }) {
  const [filter, setFilter] = useState<'todos' | 'abiertos' | 'resueltos'>(forSupport ? 'abiertos' : 'todos');
  const shown = tickets.filter((t) =>
    filter === 'todos' ? true : filter === 'resueltos' ? t.status === 'resuelto' : t.status !== 'resuelto',
  );

  return (
    <div>
      <div className="mb-3 inline-flex gap-1 rounded-full bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-soft)]">
        {(['abiertos', 'resueltos', 'todos'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition ${filter === f ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-14 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text)]">Nada por aquí</p>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">{forSupport ? 'Ningún ticket en esta vista.' : 'Cuando abras un ticket, aparece aquí.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((t) => (
            <li key={t.id}>
              <Link href={`/comunidade/soporte/${t.id}`} className="flex items-center gap-3 rounded-[18px] bg-[var(--bg-elevated)] px-4 py-3.5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
                {forSupport && <Avatar name={t.user.name} src={t.user.avatar} size={36} color={avatarColor(t.user.name)} fallback={initials(t.user.name)} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-[var(--text)]">{t.subject}</p>
                  <p className="text-[12.5px] text-[var(--text-faint)]">
                    {forSupport && <>{t.user.name} · </>}
                    {t.messageCount} {t.messageCount === 1 ? 'mensaje' : 'mensajes'} · {relativeTime(t.lastMessageAt)}
                  </p>
                </div>
                {forSupport && t.awaitingSupport && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" title="Esperando respuesta" />}
                <StatusChip status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TicketThread({ ticket, viewerId, forSupport }: { ticket: TicketDetail; viewerId: string; forSupport: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(answerTicket, {});
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <>
      <section className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--text)]">{ticket.subject}</h2>
            <p className="mt-1 text-[12.5px] text-[var(--text-faint)]">
              {forSupport ? `${ticket.user.name} · ${ticket.user.email} · ` : ''}abierto {relativeTime(ticket.createdAt)}
            </p>
          </div>
          {forSupport ? (
            <label className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[var(--text-muted)]">
              Estado
              <select
                defaultValue={ticket.status}
                onChange={(e) => startTransition(() => changeTicketStatus(ticket.id, e.target.value))}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] outline-none"
              >
                {Object.entries(TICKET_STATUS).map(([id, s]) => (
                  <option key={id} value={id}>{s.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <StatusChip status={ticket.status} />
          )}
        </div>

        <ul className="mt-5 flex flex-col gap-4">
          {ticket.messages.map((m) => {
            const mine = m.author.id === viewerId;
            return (
              <li key={m.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar name={m.author.name} src={m.author.avatar} size={34} color={avatarColor(m.author.name)} fallback={initials(m.author.name)} />
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.fromSupport ? 'bg-[var(--accent-soft)]/60 ring-1 ring-[var(--accent)]/30' : mine ? 'bg-[var(--violet-soft)]' : 'bg-[var(--bg-sunken)]'}`}>
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-[var(--text)]">
                    {m.author.name}
                    {m.fromSupport && <TeamBadge />}
                    <span className="font-normal text-[var(--text-faint)]">{relativeTime(m.createdAt)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">{m.content}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <form ref={ref} action={action} className="mt-4 rounded-[22px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <textarea name="content" rows={3} maxLength={4000} placeholder={forSupport ? 'Responder como equipo…' : ticket.status === 'resuelto' ? 'Escribe si necesitas algo más; el ticket se reabre.' : 'Escribe tu respuesta…'} className={`${input} resize-none`} />
        <div className="mt-3 flex items-center gap-3">
          <Submit label="Enviar" />
          {state.error && <p role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>
    </>
  );
}
