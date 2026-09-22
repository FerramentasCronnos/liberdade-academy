'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useOptimistic, useTransition } from 'react';
import { pinPost, removePost, toggleLike } from '@/app/(app)/comunidade/actions';
import { avatarColor, initials, relativeTime, type CommunityPost } from '@/lib/community';
import { Avatar } from './avatar';
import { IconHeart, IconMessage, IconStar, IconX } from './icons';

export function TeamBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
      Equipo
    </span>
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
  /** Na página do post: texto inteiro, sem link de "ver más". */
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
  const long = !detail && post.content.length > 480;
  const text = long ? `${post.content.slice(0, 480).trimEnd()}…` : post.content;

  const onLike = () =>
    startTransition(async () => {
      addOptimistic(null);
      await toggleLike(post.id);
    });

  return (
    <article className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <header className="flex items-center gap-3">
        <Link href={`/comunidade/membro/${post.author.id}`} className="shrink-0">
          <Avatar
            name={post.author.name}
            src={post.author.avatar}
            size={44}
            color={avatarColor(post.author.name)}
            fallback={initials(post.author.name)}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-[var(--text)]">
            <Link href={`/comunidade/membro/${post.author.id}`} className="truncate transition hover:text-[var(--brand)]">
              {post.author.name}
            </Link>
            {post.author.isAdmin ? (
              <TeamBadge />
            ) : (
              <span className="shrink-0 rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                Nivel {post.author.level}
              </span>
            )}
          </p>
          <p className="flex items-center gap-1.5 text-[12.5px] text-[var(--text-faint)]">
            <span>{relativeTime(post.createdAt)}</span>
            {post.space && (
              <>
                <span aria-hidden>·</span>
                <Link href={`/comunidade/e/${post.space.slug}`} className="transition hover:text-[var(--brand)]">
                  {post.space.emoji} {post.space.name}
                </Link>
              </>
            )}
          </p>
        </div>

        {post.pinned && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
            <IconStar className="h-3 w-3" fill="currentColor" /> Fijado
          </span>
        )}
      </header>

      {post.title && (
        <h2 className="mt-3 font-display text-[19px] font-semibold leading-snug text-[var(--text)]">
          {detail ? post.title : <Link href={href} className="transition hover:text-[var(--brand)]">{post.title}</Link>}
        </h2>
      )}

      <p className={`${post.title ? 'mt-1.5' : 'mt-3'} whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--text)]`}>
        {text}
        {long && (
          <>
            {' '}
            <Link href={href} className="font-semibold text-[var(--brand)]">Ver más</Link>
          </>
        )}
      </p>

      {post.image && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img src={post.image} alt="" loading="lazy" className="max-h-[520px] w-full object-cover" />
        </div>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-[var(--border)] pt-3">
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

        <span className="ml-auto flex items-center gap-1">
          {viewerIsAdmin && (
            <button
              type="button"
              onClick={() => startTransition(() => pinPost(post.id, !post.pinned))}
              className="rounded-full px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]"
            >
              {post.pinned ? 'Desfijar' : 'Fijar'}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              aria-label="Eliminar publicación"
              onClick={() => {
                if (confirm('¿Eliminar esta publicación?')) startTransition(() => removePost(post.id, backTo));
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-red-500"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </span>
      </footer>
    </article>
  );
}
