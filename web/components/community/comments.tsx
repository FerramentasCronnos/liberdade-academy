'use client';

import { RichText } from '@/components/rich-text';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { comment, type CommentState } from '@/app/(app)/comunidade/actions';
import { avatarColor, initials, relativeTime, type CommunityComment } from '@/lib/community';
import { Avatar } from '@/components/avatar';
import { TeamBadge } from '@/components/post-card';
import { AttachmentList, AttachmentsField } from './attachments';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Enviando…' : label}
    </button>
  );
}

/**
 * Selo do comentário em revisão ou recusado. Só autor e equipe recebem esses
 * comentários do servidor, então quem não é admin está vendo o próprio.
 */
export function CommentReviewNotice({ c, viewerIsAdmin }: { c: CommunityComment; viewerIsAdmin: boolean }) {
  if (c.reviewStatus === 'pending') {
    return (
      <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">En revisión</span>
        {viewerIsAdmin ? 'Pendiente de aprobación del equipo.' : 'El equipo lo está revisando. Solo tú lo ves por ahora.'}
      </p>
    );
  }
  if (c.reviewStatus === 'rejected') {
    return (
      <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-400/15 dark:text-red-300">No publicado</span>
        {c.reviewNote ? <span>Nota del equipo: {c.reviewNote}</span> : <span>El equipo decidió no publicarlo. Solo tú lo ves.</span>}
      </p>
    );
  }
  return null;
}

function CommentForm({
  postId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  postId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [state, action] = useActionState<CommentState, FormData>(comment, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      onDone?.();
    }
  }, [state.ok, onDone]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="content"
        rows={2}
        maxLength={2000}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[14px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
      />
      {!parentId && <AttachmentsField />}
      <div className="flex items-center gap-3">
        <Submit label={parentId ? 'Responder' : 'Comentar'} />
        {onDone && (
          <button type="button" onClick={onDone} className="text-[13px] font-medium text-[var(--text-muted)]">
            Cancelar
          </button>
        )}
        {state.error && <p role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{state.error}</p>}
      </div>
      {/* foi para a fila da equipe: aviso informativo, não erro */}
      {state.review && state.message && (
        <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
          {state.message}
        </p>
      )}
    </form>
  );
}

function CommentItem({ c, postId, viewerIsAdmin, depth = 0 }: { c: CommunityComment; postId: string; viewerIsAdmin: boolean; depth?: number }) {
  const [replying, setReplying] = useState(false);

  return (
    <li className={depth ? 'ml-11 mt-3' : ''}>
      <div className="flex gap-3">
        <Link href={`/comunidade/membro/${c.author.id}`} className="shrink-0">
          <Avatar name={c.author.name} src={c.author.avatar} size={depth ? 30 : 36} color={avatarColor(c.author.name)} fallback={initials(c.author.name)} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className={`rounded-2xl px-4 py-3 ${c.author.isAdmin ? 'bg-[var(--accent-soft)]/60 ring-1 ring-[var(--accent)]/30' : 'bg-[var(--bg-sunken)]'}`}>
            <CommentReviewNotice c={c} viewerIsAdmin={viewerIsAdmin} />
            <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-[var(--text)]">
              <Link href={`/comunidade/membro/${c.author.id}`} className="transition hover:text-[var(--brand)]">{c.author.name}</Link>
              {c.author.isAdmin && <TeamBadge />}
              <span className="text-[12px] font-normal text-[var(--text-faint)]">{relativeTime(c.createdAt)}</span>
            </p>
            {c.content && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]"><RichText text={c.content} /></p>}
            <AttachmentList urls={c.attachments} />
          </div>
          {!replying ? (
            <button type="button" onClick={() => setReplying(true)} className="mt-1 px-2 text-[12.5px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--brand)]">
              Responder
            </button>
          ) : (
            <div className="mt-2">
              <CommentForm postId={postId} parentId={c.id} placeholder={`Responder a ${c.author.name.split(' ')[0]}…`} autoFocus onDone={() => setReplying(false)} />
            </div>
          )}
        </div>
      </div>
      {c.replies.length > 0 && (
        <ul>
          {c.replies.map((r) => (
            <CommentItem key={r.id} c={r} postId={postId} viewerIsAdmin={viewerIsAdmin} depth={1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Comments({ postId, comments, viewerIsAdmin = false }: { postId: string; comments: CommunityComment[]; viewerIsAdmin?: boolean }) {
  // o título conta só o que está publicado; os em revisão aparecem com selo
  const published = (c: CommunityComment) => (c.reviewStatus ? 0 : 1);
  const total = comments.reduce((n, c) => n + published(c) + c.replies.reduce((m, r) => m + published(r), 0), 0);

  return (
    <section id="comentarios" className="mt-4 rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[17px] font-semibold text-[var(--text)]">
        {total === 0 ? 'Sé la primera en comentar' : `${total} ${total === 1 ? 'comentario' : 'comentarios'}`}
      </h3>
      <div className="mt-3">
        <CommentForm postId={postId} placeholder="Escribe un comentario…" />
      </div>
      {comments.length > 0 && (
        <ul className="mt-5 flex flex-col gap-4">
          {comments.map((c) => (
            <CommentItem key={c.id} c={c} postId={postId} viewerIsAdmin={viewerIsAdmin} />
          ))}
        </ul>
      )}
    </section>
  );
}
