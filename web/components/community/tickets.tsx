'use client';

import Link from 'next/link';
import { useActionState, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { answerTicket, changeTicketStatus, openTicket, type FormState } from '@/app/(app)/comunidade/actions';
import { avatarColor, initials, relativeTime, ticketCategory, TICKET_CATEGORIES, TICKET_STATUS, type TicketDetail, type TicketSummary } from '@/lib/community';
import { IconX } from '@/components/icons';
import { Avatar } from '@/components/avatar';
import { TeamBadge } from '@/components/post-card';
import { AttachmentList, AttachmentsField } from './attachments';

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

/**
 * Abertura de ticket em janela própria: primeiro o tema, depois o relato.
 * É o único lugar com gravação de áudio: explicar um problema falando é
 * mais fácil do que escrever, e a equipe ouve com contexto.
 */
export function NewTicket() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [state, action] = useActionState<FormState, FormData>(openTicket, {});

  const close = () => {
    setOpen(false);
    setCategory(null);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-[var(--text)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--bg-elevated)] transition hover:opacity-90">
        Nuevo ticket
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="new-ticket-title" className="flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[26px] bg-[var(--bg-elevated)] shadow-[var(--shadow-lift)] sm:rounded-[26px]">
            <header className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0 flex-1">
                <h2 id="new-ticket-title" className="font-display text-[20px] font-semibold text-[var(--text)]">
                  {category ? `${ticketCategory(category).emoji} ${ticketCategory(category).label}` : '¿Sobre qué es tu ticket?'}
                </h2>
                <p className="text-[12.5px] text-[var(--text-muted)]">
                  {category ? 'Solo tú y el equipo ven esta conversación.' : 'Elige el tema para que te atienda la persona correcta.'}
                </p>
              </div>
              {category && (
                <button type="button" onClick={() => setCategory(null)} className="text-[12.5px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
                  Cambiar tema
                </button>
              )}
              <button type="button" onClick={close} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-faint)] hover:bg-[var(--bg-sunken)]">
                <IconX className="h-4 w-4" />
              </button>
            </header>

            {!category ? (
              <ul className="grid gap-2 overflow-y-auto p-5 sm:grid-cols-2">
                {TICKET_CATEGORIES.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setCategory(c.id)} className="flex h-full w-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]/60 p-4 text-left transition hover:border-[var(--brand)] hover:bg-[var(--violet-soft)]/50">
                      <span className="text-[22px]" aria-hidden>{c.emoji}</span>
                      <span>
                        <span className="block text-[14.5px] font-semibold text-[var(--text)]">{c.label}</span>
                        <span className="block text-[12.5px] text-[var(--text-muted)]">{c.hint}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <form action={action} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="category" value={category} />
                <div className="flex flex-col gap-3 overflow-y-auto px-6 py-5">
                  <label className="text-[12.5px] font-semibold text-[var(--text-muted)]">
                    Asunto
                    <input name="subject" maxLength={120} autoFocus placeholder="En pocas palabras, qué pasa" className={`${input} mt-1`} />
                  </label>
                  <label className="text-[12.5px] font-semibold text-[var(--text-muted)]">
                    Cuéntanos más
                    <textarea name="content" rows={5} maxLength={4000} placeholder="Qué intentaste, qué esperabas y qué viste. Si prefieres, graba un audio explicando." className={`${input} mt-1 resize-none`} />
                  </label>
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-3">
                    <p className="mb-2 text-[12.5px] font-semibold text-[var(--text-muted)]">Adjuntos y audio</p>
                    <AttachmentsField allowAudio />
                  </div>
                </div>
                <footer className="flex items-center gap-3 border-t border-[var(--border)] px-6 py-4">
                  <Submit label="Abrir ticket" />
                  <button type="button" onClick={close} className="text-[13px] font-medium text-[var(--text-muted)]">Cancelar</button>
                  {state.error && <p role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{state.error}</p>}
                </footer>
              </form>
            )}
          </div>
        </div>
      )}
    </>
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
                  <p className="truncate text-[14.5px] font-semibold text-[var(--text)]">
                    <span className="mr-1.5" aria-hidden>{ticketCategory(t.category).emoji}</span>
                    {t.subject}
                  </p>
                  <p className="text-[12.5px] text-[var(--text-faint)]">
                    {ticketCategory(t.category).label} · {forSupport && <>{t.user.name} · </>}
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
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  // envolve a action para limpar texto e anexos só quando o servidor confirma
  const action = async (formData: FormData) => {
    const result = await answerTicket({}, formData);
    if (!result.ok) {
      setError(result.error ?? 'No pude enviar la respuesta.');
      return;
    }
    setError(null);
    ref.current?.reset();
    setResetKey((k) => k + 1);
  };

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
                  {m.content && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">{m.content}</p>}
                  <AttachmentList urls={m.attachments} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <form ref={ref} action={action} className="mt-4 rounded-[22px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <textarea name="content" rows={3} maxLength={4000} placeholder={forSupport ? 'Responder como equipo…' : ticket.status === 'resuelto' ? 'Escribe si necesitas algo más; el ticket se reabre.' : 'Escribe tu respuesta…'} className={`${input} resize-none`} />
        <div className="mt-3">
          <AttachmentsField resetKey={resetKey} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Submit label="Enviar" />
          {error && <p role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </form>
    </>
  );
}
