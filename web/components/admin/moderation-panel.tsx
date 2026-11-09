'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { approveComment, approvePost, rejectComment, rejectPost } from '@/app/(app)/admin/moderation-actions';
import { Avatar } from '../avatar';
import { AttachmentList } from '../community/attachments';
import { avatarColor, initials, relativeTime } from '@/lib/community';
import type { PendingComment, PendingPost } from '@/lib/community-data';
import { describeReviewReason } from '@/lib/moderation';

/**
 * Fila de moderação: posts e comentários retidos (termo da lista, como
 * reembolso, ou triagem da IA por falar mal da comunidade).
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

/** Aprobar / Rechazar (com nota opcional) e o link para abrir no contexto. */
function ReviewActions({
  id,
  approve,
  reject,
  href,
  linkLabel,
}: {
  id: string;
  approve: (formData: FormData) => Promise<void>;
  reject: (formData: FormData) => Promise<void>;
  href: string;
  linkLabel: string;
}) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
      <form action={approve}>
        <input type="hidden" name="id" value={id} />
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
        <form action={reject} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={id} />
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
      <Link href={href} className="ml-auto text-[12.5px] font-semibold text-[var(--text-muted)] underline-offset-2 hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

function ReasonBadge({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
      {describeReviewReason(note)}
    </span>
  );
}

function PendingCard({ post }: { post: PendingPost }) {
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
        <ReasonBadge note={post.note} />
      </div>

      {post.title && <h3 className="mt-4 font-display text-[19px] font-semibold leading-snug text-[var(--text)]">{post.title}</h3>}
      <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-[1.65] text-[var(--text)]">{post.content}</p>
      {post.image && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img src={post.image} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />
        </div>
      )}
      <AttachmentList urls={post.attachments} />

      <ReviewActions id={post.id} approve={approvePost} reject={rejectPost} href={`/comunidade/post/${post.id}`} linkLabel="Abrir publicación" />
    </li>
  );
}

function PendingCommentCard({ comment }: { comment: PendingComment }) {
  return (
    <li className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/comunidade/membro/${comment.author.id}`} className="shrink-0">
          <Avatar name={comment.author.name} src={comment.author.avatar} size={40} color={avatarColor(comment.author.name)} fallback={initials(comment.author.name)} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-[var(--text)]">{comment.author.name}</p>
          <p className="truncate text-[12.5px] text-[var(--text-muted)]">
            {comment.author.email}
            {comment.post.space && <> · {comment.post.space.emoji} {comment.post.space.name}</>}
            {' '}· {when(comment.createdAt)} ({relativeTime(comment.createdAt)})
          </p>
        </div>
        <ReasonBadge note={comment.note} />
      </div>

      <p className="mt-4 truncate text-[12.5px] text-[var(--text-muted)]">
        {comment.isReply ? 'Respuesta en' : 'Comentario en'}{' '}
        <Link href={`/comunidade/post/${comment.post.id}#comentarios`} className="font-semibold text-[var(--text)] hover:text-[var(--brand)]">
          {comment.post.title}
        </Link>
      </p>
      <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-[var(--bg-sunken)] px-4 py-3 text-[14.5px] leading-[1.65] text-[var(--text)]">{comment.content}</p>
      <AttachmentList urls={comment.attachments} />

      <ReviewActions id={comment.id} approve={approveComment} reject={rejectComment} href={`/comunidade/post/${comment.post.id}#comentarios`} linkLabel="Abrir publicación" />
    </li>
  );
}

function ReviewedBadge({ status, feminine }: { status: 'pending' | 'approved' | 'rejected'; feminine: boolean }) {
  const label = status === 'approved' ? (feminine ? 'Aprobada' : 'Aprobado') : feminine ? 'Rechazada' : 'Rechazado';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
        status === 'approved'
          ? 'bg-[var(--money-soft)] text-[var(--money)]'
          : 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300'
      }`}
    >
      {label}
    </span>
  );
}

function SectionHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[17px] font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{children}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[13.5px] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

type ReviewedRow = {
  key: string;
  isComment: boolean;
  href: string;
  label: string;
  context?: string;
  authorName: string;
  spaceName?: string;
  reviewedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
};

export function ModerationPanel({ posts, comments = [] }: { posts: PendingPost[]; comments?: PendingComment[] }) {
  const pending = posts.filter((p) => p.status === 'pending');
  const pendingComments = comments.filter((c) => c.status === 'pending');

  // posts e comentários revisados numa lista só, do mais recente ao mais antigo
  const reviewed: ReviewedRow[] = [
    ...posts.filter((p) => p.status !== 'pending').map((post) => ({
      key: `p-${post.id}`,
      isComment: false,
      href: `/comunidade/post/${post.id}`,
      label: post.title || post.content.slice(0, 90),
      authorName: post.author.name,
      spaceName: post.space?.name,
      reviewedAt: post.reviewedAt,
      status: post.status,
      note: post.note,
    })),
    ...comments.filter((c) => c.status !== 'pending').map((c) => ({
      key: `c-${c.id}`,
      isComment: true,
      href: `/comunidade/post/${c.post.id}#comentarios`,
      label: c.content.slice(0, 90),
      context: c.post.title,
      authorName: c.author.name,
      spaceName: c.post.space?.name,
      reviewedAt: c.reviewedAt,
      status: c.status,
      note: c.note,
    })),
  ]
    .sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''))
    .slice(0, 20);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Publicaciones en revisión">
        Las publicaciones que mencionan reembolsos o que la IA marca por hablar mal de la comunidad, del curso o del equipo quedan aquí antes de salir al feed. Aprobar la publica como nueva y avisa a la persona; rechazar la deja visible solo para quien la escribió.
      </SectionHeader>

      {pending.length === 0 ? (
        <Empty>No hay publicaciones esperando revisión.</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((post) => <PendingCard key={post.id} post={post} />)}
        </ul>
      )}

      <SectionHeader title="Comentarios en revisión">
        Los comentarios pasan por el mismo filtro. Aprobar lo publica en la conversación, avisa a quien lo escribió y al autor de la publicación; rechazar lo deja visible solo para quien lo escribió.
      </SectionHeader>

      {pendingComments.length === 0 ? (
        <Empty>No hay comentarios esperando revisión.</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {pendingComments.map((c) => <PendingCommentCard key={c.id} comment={c} />)}
        </ul>
      )}

      {reviewed.length > 0 && (
        <details className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <summary className="cursor-pointer text-[14px] font-semibold text-[var(--text)]">
            Últimas revisiones <span className="text-[var(--text-faint)]">({reviewed.length})</span>
          </summary>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {reviewed.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center gap-3 py-3">
                <ReviewedBadge status={row.status} feminine={!row.isComment} />
                <div className="min-w-0 flex-1">
                  <Link href={row.href} className="block truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]">
                    {row.isComment && <span className="text-[var(--text-faint)]">Comentario: </span>}
                    {row.label}
                  </Link>
                  <p className="truncate text-[12px] text-[var(--text-faint)]">
                    {row.authorName}
                    {row.context && <> · en “{row.context}”</>}
                    {row.spaceName && <> · {row.spaceName}</>}
                    {row.reviewedAt && <> · {row.isComment ? 'revisado' : 'revisada'} {relativeTime(row.reviewedAt)}</>}
                    {row.status === 'rejected' && row.note && <> · nota: {row.note}</>}
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
