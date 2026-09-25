'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { comment, createPost, pinPost, removePost, resolveThread } from '@/app/(app)/comunidade/actions';
import type { ChatMessage } from '@/lib/community-data';
import { avatarColor, initials, spaceColor, type CommunityComment, type Space } from '@/lib/community';
import { Avatar } from '@/components/avatar';
import { TeamBadge } from '@/components/post-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { IconX } from '@/components/icons';
import { AttachmentList, AttachmentsField } from './attachments';

/**
 * Espaço em modo chat, como no Circle: linha do tempo contínua com
 * separadores por dia, mensagem fixada no topo, respostas em um painel
 * lateral e um compositor com foto e áudio no rodapé.
 */

const time = (iso: string) => new Date(iso).toLocaleTimeString('es-419', { hour: '2-digit', minute: '2-digit' });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Hoy';
  if (same(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-419', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Send({ label = 'Enviar' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="grid h-10 w-10 place-items-center rounded-full bg-[var(--text)] text-[var(--bg-elevated)] transition hover:opacity-90 disabled:opacity-50" aria-label={label}>
      <span aria-hidden>↑</span>
    </button>
  );
}

function Composer({
  onSubmit,
  placeholder,
  hidden,
}: {
  onSubmit: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>;
  placeholder: string;
  hidden: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const ref = useRef<HTMLFormElement>(null);

  const action = async (fd: FormData) => {
    const r = await onSubmit(fd);
    if (!r.ok) {
      setError(r.error ?? 'No pude enviar.');
      return;
    }
    setError(null);
    ref.current?.reset();
    setResetKey((k) => k + 1);
  };

  return (
    <form ref={ref} action={action} className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-soft)]">
      {hidden}
      <textarea
        name="content"
        rows={2}
        maxLength={4000}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ref.current?.requestSubmit();
          }
        }}
        className="w-full resize-none bg-transparent px-1 text-[14.5px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
      />
      <div className="mt-2 flex items-end justify-between gap-3">
        <AttachmentsField resetKey={resetKey} />
        <Send />
      </div>
      {error && <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function Reply({ c }: { c: CommunityComment }) {
  return (
    <li className="flex gap-3">
      <Avatar name={c.author.name} src={c.author.avatar} size={32} color={avatarColor(c.author.name)} fallback={initials(c.author.name)} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-[var(--text)]">
          {c.author.name}
          {c.author.isAdmin && <TeamBadge />}
          <span className="text-[12px] font-normal text-[var(--text-faint)]">{time(c.createdAt)}</span>
        </p>
        {c.content && <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">{c.content}</p>}
        <AttachmentList urls={c.attachments} />
      </div>
    </li>
  );
}

/**
 * Rodapé da thread. A equipe abre a conversa; o autor da mensagem responde
 * dentro dela; qualquer um dos dois finaliza. Só a equipe reabre.
 */
function ThreadFooter({ thread, viewerId, viewerIsAdmin }: { thread: ChatMessage; viewerId: string; viewerIsAdmin: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const isAuthor = thread.author.id === viewerId;
  const resolved = Boolean(thread.resolvedAt);
  const started = thread.replies.length > 0;
  const canReply = !resolved && (viewerIsAdmin || (isAuthor && started));
  const canResolve = started && !resolved && (viewerIsAdmin || isAuthor);

  const toggle = async (value: boolean) => {
    const r = await resolveThread(thread.id, value);
    setError(r.error ?? null);
  };

  return (
    <div className="border-t border-[var(--border)] px-4 py-3">
      {canReply ? (
        <Composer
          placeholder={viewerIsAdmin ? 'Responder como equipo…' : 'Responder al equipo…'}
          onSubmit={(fd) => comment({}, fd)}
          hidden={<input type="hidden" name="postId" value={thread.id} />}
        />
      ) : (
        <p className="rounded-2xl bg-[var(--bg-sunken)] px-4 py-3 text-center text-[13px] text-[var(--text-muted)]">
          {resolved
            ? 'Atención finalizada.'
            : isAuthor
              ? 'El equipo te responderá aquí. Te avisamos cuando lo haga.'
              : 'Solo el equipo responde en este espacio.'}
        </p>
      )}
      {(canResolve || (resolved && viewerIsAdmin)) && (
        <div className="mt-2 flex items-center justify-end gap-3">
          {canResolve && (
            <button type="button" onClick={() => toggle(true)} className="rounded-full bg-[var(--money-soft)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--money)] transition hover:opacity-90">
              ✓ Finalizar atención
            </button>
          )}
          {resolved && viewerIsAdmin && (
            <button type="button" onClick={() => toggle(false)} className="text-[12.5px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
              Reabrir
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function ChatSpace({
  space,
  messages,
  members,
  viewerId,
  viewerIsAdmin,
}: {
  space: Space;
  messages: ChatMessage[];
  members: number;
  viewerId: string;
  viewerIsAdmin: boolean;
}) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const thread = messages.find((m) => m.id === threadId) ?? null;
  const pinned = messages.find((m) => m.pinned) ?? null;
  const color = spaceColor(space.slug);

  // ao abrir e a cada mensagem nova, rola para o fim
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div className="flex h-[calc(100dvh-52px)] lg:h-dvh">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} aria-hidden />
          <h1 className="min-w-0 flex-1 truncate font-display text-[19px] font-semibold text-[var(--text)]">{space.name}</h1>
          <span className="text-[13px] text-[var(--text-muted)]">{members} miembros</span>
          <ThemeToggle />
        </header>

        {pinned && (
          <button type="button" onClick={() => setThreadId(pinned.id)} className="flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2.5 text-left">
            <Avatar name={pinned.author.name} src={pinned.author.avatar} size={22} color={avatarColor(pinned.author.name)} fallback={initials(pinned.author.name)} />
            <span className="text-[13px] font-semibold text-[var(--text)]">{pinned.author.name}</span>
            <span className="text-[13px]" aria-hidden>📌</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-muted)]">{pinned.content}</span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <p className="py-16 text-center text-[14px] text-[var(--text-muted)]">Todavía no hay mensajes. Escribe el primero.</p>
          )}
          <ul className="flex flex-col gap-5">
            {messages.map((m, i) => {
              const day = dayLabel(m.createdAt);
              const showDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== day;
              const mine = m.author.id === viewerId;
              return (
                <li key={m.id}>
                  {showDay && (
                    <p className="mb-4 flex items-center gap-3 text-[12.5px] text-[var(--text-faint)]">
                      {day}
                      <span className="h-px flex-1 bg-[var(--border)]" />
                    </p>
                  )}
                  <div className="group flex gap-3">
                    <Link href={`/comunidade/membro/${m.author.id}`} className="shrink-0 pt-0.5">
                      <Avatar name={m.author.name} src={m.author.avatar} size={40} color={avatarColor(m.author.name)} fallback={initials(m.author.name)} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-[var(--text)]">
                        {m.author.name}
                        {m.author.isAdmin && <TeamBadge />}
                        <span className="text-[12px] font-normal text-[var(--text-faint)]">{time(m.createdAt)}</span>
                        {m.pinned && <span aria-hidden>📌</span>}
                        <span className="ml-auto hidden items-center gap-1 group-hover:inline-flex">
                          {viewerIsAdmin && (
                            <button type="button" onClick={() => pinPost(m.id, !m.pinned)} className="rounded-full px-2 py-0.5 text-[11.5px] font-medium text-[var(--text-faint)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]">
                              {m.pinned ? 'Desfijar' : 'Fijar'}
                            </button>
                          )}
                          {(viewerIsAdmin || mine) && (
                            <button type="button" onClick={() => { if (confirm('¿Eliminar este mensaje?')) void removePost(m.id, `/comunidade/e/${space.slug}`); }} className="rounded-full px-2 py-0.5 text-[11.5px] font-medium text-[var(--text-faint)] hover:bg-[var(--bg-sunken)] hover:text-red-500">
                              Eliminar
                            </button>
                          )}
                        </span>
                      </p>
                      {m.content && <p className="mt-0.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--text)]">{m.content}</p>}
                      <AttachmentList urls={m.attachments} />
                      {(m.replies.length > 0 || viewerIsAdmin) && (
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setThreadId(m.id)}
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12.5px] font-semibold transition ${
                              m.replies.length ? 'bg-[var(--bg-elevated)] text-[var(--brand)] shadow-[var(--shadow-soft)]' : 'text-[var(--text-faint)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]'
                            }`}
                          >
                            {m.replies.length > 0 && (
                              <span className="flex -space-x-1.5">
                                {m.replies.slice(0, 3).map((r) => (
                                  <Avatar key={r.id} name={r.author.name} src={r.author.avatar} size={18} color={avatarColor(r.author.name)} fallback={initials(r.author.name)} className="ring-2 ring-[var(--bg-elevated)]" />
                                ))}
                              </span>
                            )}
                            {m.replies.length ? `${m.replies.length} ${m.replies.length === 1 ? 'respuesta' : 'respuestas'}` : 'Responder como equipo'}
                          </button>
                          {m.resolvedAt && (
                            <span className="rounded-full bg-[var(--money-soft)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--money)]">Resuelto</span>
                          )}
                          {!m.resolvedAt && m.replies.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">En atención</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div ref={endRef} />
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3">
          <Composer
            placeholder={`Escribe en ${space.name}…  (Enter envía, Shift+Enter salta línea)`}
            onSubmit={(fd) => createPost({}, fd)}
            hidden={<input type="hidden" name="space" value={space.slug} />}
          />
        </div>
      </section>

      {thread && (
        <aside className="fixed inset-0 z-20 flex flex-col bg-[var(--bg-elevated)] lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:border-l lg:border-[var(--border)]">
          <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
            <h2 className="flex-1 font-display text-[18px] font-semibold text-[var(--text)]">Hilo</h2>
            <button type="button" onClick={() => setThreadId(null)} aria-label="Cerrar hilo" className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-faint)] hover:bg-[var(--bg-sunken)]">
              <IconX className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex gap-3">
              <Avatar name={thread.author.name} src={thread.author.avatar} size={36} color={avatarColor(thread.author.name)} fallback={initials(thread.author.name)} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
                  {thread.author.name}
                  {thread.author.isAdmin && <TeamBadge />}
                  <span className="text-[12px] font-normal text-[var(--text-faint)]">{time(thread.createdAt)}</span>
                </p>
                {thread.content && <p className="mt-0.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--text)]">{thread.content}</p>}
                <AttachmentList urls={thread.attachments} />
              </div>
            </div>
            <p className="my-4 flex items-center gap-3 text-[12.5px] font-semibold text-[var(--text-muted)]">
              {thread.replies.length} {thread.replies.length === 1 ? 'respuesta' : 'respuestas'}
              <span className="h-px flex-1 bg-[var(--border)]" />
            </p>
            <ul className="flex flex-col gap-4">
              {thread.replies.map((r) => (
                <Reply key={r.id} c={r} />
              ))}
            </ul>
          </div>
          <ThreadFooter thread={thread} viewerId={viewerId} viewerIsAdmin={viewerIsAdmin} />
        </aside>
      )}
    </div>
  );
}
