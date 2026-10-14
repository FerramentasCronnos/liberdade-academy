'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { approvePost, rejectPost } from '@/app/(app)/admin/moderation-actions';
import { Avatar } from '../avatar';
import { AttachmentList } from '../community/attachments';
import { avatarColor, initials, relativeTime } from '@/lib/community';
import type { PendingPost } from '@/lib/community-data';

/**
 * Fila de moderação: posts retidos por mencionar reembolso.
 * Cada card tem Aprobar e Rechazar (com nota opcional); embaixo, os últimos
 * revisados ficam recolhidos para a fila não virar histórico.
 */

function Submit({ label, pendingLabel, tone }: { label: string; pendingLabel: string; tone: 'approve' | 'reject' }) {
  const { pending } = useFormStatus();
  const cls =
    tone === 'approve'
      ? 'bg-[var(--money)] text-white hover:opacity-90'
      : 'border border-[var(--border)] text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10';
  return (
    <button type="submit" disabled={pending} className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition disabled:opacity-60 ${cls}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function when(iso: string) {
  return new Date(iso).toLocaleString('es-419', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function PendingCard({ post }: { post: PendingPost }) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <li className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/comunidade/membro/${post.author.id}`} className="shrink-0">
          <Avatar name={post.author.name} src={post.author.avatar} size={40} color={avatarColor(post.author.name)} fallback={initials(post.author.name)} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-[var(--text)]">{post.author.name}</p>
          <p className="truncate text-[12.5px] text-[var(--text-muted)]">
            {post.author.email}
            {post.space && <> · {post.space.emoji} {post.space.name}</>}
            {' '}· {when(post.createdAt)} ({relativeTime(post.createdAt)})
          </p>
        </div>
        {post.note && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
            menciona “{post.note}”
          </span>
        )}
      </div>

      {post.title && <h3 className="mt-4 font-display text-[19px] font-semibold leading-snug text-[var(--text)]">{post.title}</h3>}
      <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-[1.65] text-[var(--text)]">{post.content}</p>
      {post.image && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img src={post.image} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />
        </div>
      )}
      <AttachmentList urls={post.attachments} />

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <form action={approvePost}>
          <input type="hidden" name="id" value={post.id} />
          <Submit label="Aprobar y publicar" pendingLabel="Publicando…" tone="approve" />
        </form>
        {!rejecting ? (
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-[13px] font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            Rechazar
          </button>
        ) : (
          <form action={rejectPost} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={post.id} />
            <input
              name="note"
              autoFocus
              maxLength={500}
              placeholder="Nota para la persona (opcional)"
              className="min-w-[200px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
            />
            <Submit label="Confirmar rechazo" pendingLabel="Guardando…" tone="reject" />
            <button type="button" onClick={() => setRejecting(false)} className="text-[12.5px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
              Cancelar
            </button>
          </form>
        )}
        <Link href={`/comunidade/post/${post.id}`} className="ml-auto text-[12.5px] font-semibold text-[var(--text-muted)] underline-offset-2 hover:underline">
          Abrir publicación
        </Link>
      </div>
    </li>
  );
}

export function ModerationPanel({ posts }: { posts: PendingPost[] }) {
  const pending = posts.filter((p) => p.status === 'pending');
  const reviewed = posts.filter((p) => p.status !== 'pending').slice(0, 20);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-[17px] font-semibold text-[var(--text)]">Publicaciones en revisión</h3>
        <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
          Las publicaciones que mencionan reembolsos quedan aquí antes de salir al feed. Aprobar la publica como nueva y avisa a la persona; rechazar la deja visible solo para quien la escribió.
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[13.5px] text-[var(--text-muted)]">
          No hay publicaciones esperando revisión.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((post) => <PendingCard key={post.id} post={post} />)}
        </ul>
      )}

      {reviewed.length > 0 && (
        <details className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <summary className="cursor-pointer text-[14px] font-semibold text-[var(--text)]">
            Últimas revisadas <span className="text-[var(--text-faint)]">({reviewed.length})</span>
          </summary>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {reviewed.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                    post.status === 'approved'
                      ? 'bg-[var(--money-soft)] text-[var(--money)]'
                      : 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300'
                  }`}
                >
                  {post.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/comunidade/post/${post.id}`} className="block truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]">
                    {post.title || post.content.slice(0, 90)}
                  </Link>
                  <p className="truncate text-[12px] text-[var(--text-faint)]">
                    {post.author.name}
                    {post.space && <> · {post.space.name}</>}
                    {post.reviewedAt && <> · revisada {relativeTime(post.reviewedAt)}</>}
                    {post.status === 'rejected' && post.note && <> · nota: {post.note}</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
