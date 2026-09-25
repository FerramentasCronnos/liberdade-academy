'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { pinPost, removePost, toggleLike } from '@/app/(app)/comunidade/actions';
import { avatarColor, initials, relativeTime, type CommunityPost } from '@/lib/community';
import { Avatar } from './avatar';
import { AttachmentList } from './community/attachments';
import { IconHeart, IconMessage, IconStar } from './icons';

export function TeamBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
      Equipo
    </span>
  );
}

/** Linha abaixo do nome, como o "Founder @ ModernMind" do Circle. */
function roleLine(post: CommunityPost) {
  if (post.author.isAdmin) return 'Equipo @ Liberdade Academy';
  return `Nivel ${post.author.level} · ${relativeTime(post.createdAt)}`;
}

function Menu({
  post,
  canDelete,
  canPin,
  backTo,
}: {
  post: CommunityPost;
  canDelete: boolean;
  canPin: boolean;
  backTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!canDelete && !canPin) return null;

  const itemCls = 'block w-full rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-[var(--text)] transition hover:bg-[var(--bg-sunken)]';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Más opciones"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
      >
        <span className="text-[18px] leading-none" aria-hidden>···</span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-lift)]">
          {canPin && (
            <button type="button" className={itemCls} onClick={() => { setOpen(false); startTransition(() => pinPost(post.id, !post.pinned)); }}>
              {post.pinned ? 'Desfijar' : 'Fijar arriba'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className={`${itemCls} text-red-600 dark:text-red-400`}
              onClick={() => {
                setOpen(false);
                if (confirm('¿Eliminar esta publicación?')) startTransition(() => removePost(post.id, backTo));
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function PostCard({
  post,
  viewerId,
  viewerIsAdmin = false,
  detail = false,
  backTo = '/comunidade',
}: {
  post: CommunityPost;
  viewerId?: string;
  viewerIsAdmin?: boolean;
  /** Na página do post: texto inteiro, sem "ver más". */
  detail?: boolean;
  backTo?: string;
}) {
  const [, startTransition] = useTransition();
  const [state, addOptimistic] = useOptimistic(
    { liked: post.isLiked, likes: post.likes },
    (prev) => ({ liked: !prev.liked, likes: prev.likes + (prev.liked ? -1 : 1) }),
  );

  const href = `/comunidade/post/${post.id}`;
  const canDelete = viewerIsAdmin || viewerId === post.author.id;
  const long = !detail && post.content.length > 520;
  const text = long ? `${post.content.slice(0, 520).trimEnd()}…` : post.content;
  const title = post.title || (detail ? undefined : undefined);

  const onLike = () =>
    startTransition(async () => {
      addOptimistic(null);
      await toggleLike(post.id);
    });

  return (
    <article className="rounded-[22px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {title && (
            <h2 className="font-display text-[22px] font-semibold leading-snug tracking-tight text-[var(--text)]">
              {detail ? title : <Link href={href} className="transition hover:text-[var(--brand)]">{title}</Link>}
            </h2>
          )}
          {post.pinned && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
              <IconStar className="h-3 w-3" fill="currentColor" /> Fijado
            </span>
          )}
        </div>
        <Menu post={post} canDelete={canDelete} canPin={viewerIsAdmin} backTo={backTo} />
      </header>

      <div className={`flex items-center gap-3 ${title || post.pinned ? 'mt-4' : ''}`}>
        <Link href={`/comunidade/membro/${post.author.id}`} className="shrink-0">
          <Avatar name={post.author.name} src={post.author.avatar} size={44} color={avatarColor(post.author.name)} fallback={initials(post.author.name)} />
        </Link>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
            <Link href={`/comunidade/membro/${post.author.id}`} className="truncate transition hover:text-[var(--brand)]">{post.author.name}</Link>
            {post.author.isAdmin && <TeamBadge />}
          </p>
          <p className="truncate text-[13px] text-[var(--text-muted)]">
            {roleLine(post)}
            {post.author.isAdmin && <> · {relativeTime(post.createdAt)}</>}
            {post.space && !detail && (
              <>
                {' '}· <Link href={`/comunidade/e/${post.space.slug}`} className="transition hover:text-[var(--brand)]">{post.space.name}</Link>
              </>
            )}
          </p>
        </div>
      </div>

      {text && (
        <p className="mt-4 whitespace-pre-wrap text-[15.5px] leading-[1.65] text-[var(--text)]">
          {text}
          {long && (
            <>
              {' '}
              <Link href={href} className="font-semibold text-[var(--brand)]">Ver más</Link>
            </>
          )}
        </p>
      )}

      {post.image && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img src={post.image} alt="" loading="lazy" className="max-h-[520px] w-full object-cover" />
        </div>
      )}

      <AttachmentList urls={post.attachments} />

      {post.tags?.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`${post.space ? `/comunidade/e/${post.space.slug}` : '/comunidade'}?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-[var(--bg-sunken)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--violet-soft)] hover:text-[var(--brand)]"
            >
              #{t}
            </Link>
          ))}
        </p>
      )}

      <footer className="mt-5 flex items-center gap-1 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={onLike}
          aria-pressed={state.liked}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            state.liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]'
          }`}
        >
          <IconHeart className="h-[17px] w-[17px]" fill={state.liked ? 'currentColor' : 'none'} />
          {state.likes}
        </button>
        <Link
          href={detail ? '#comentarios' : href}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
        >
          <IconMessage className="h-[17px] w-[17px]" />
          {post.comments} {post.comments === 1 ? 'comentario' : 'comentarios'}
        </Link>
      </footer>
    </article>
  );
}
