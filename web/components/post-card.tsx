'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useOptimistic, useTransition } from 'react';
import { toggleLike } from '@/app/(app)/comunidade/actions';
import {
  avatarColor,
  categoryStyle,
  initials,
  relativeTime,
  type CommunityPost,
} from '@/lib/community';
import { Avatar } from './avatar';
import { IconHeart, IconMessage } from './icons';

export function PostCard({ post }: { post: CommunityPost }) {
  const [, startTransition] = useTransition();
  const [state, addOptimistic] = useOptimistic(
    { liked: post.isLiked, likes: post.likes },
    (prev) => ({ liked: !prev.liked, likes: prev.likes + (prev.liked ? -1 : 1) }),
  );

  const category = categoryStyle(post.category);

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
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-[var(--text)]">
            <Link
              href={`/comunidade/membro/${post.author.id}`}
              className="truncate transition hover:text-[var(--brand)]"
            >
              {post.author.name}
            </Link>
            <span className="shrink-0 rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
              Nível {post.author.level}
            </span>
          </p>
          <p className="text-[12.5px] text-[var(--text-faint)]">{relativeTime(post.createdAt)}</p>
        </div>

        {category && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${category.className}`}
          >
            {category.label}
          </span>
        )}
      </header>

      <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--text)]">
        {post.content}
      </p>

      {post.image && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="max-h-[520px] w-full object-cover"
          />
        </div>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={onLike}
          aria-pressed={state.liked}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            state.liked
              ? 'text-red-500'
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text)]'
          }`}
        >
          <IconHeart
            className="h-[17px] w-[17px]"
            fill={state.liked ? 'currentColor' : 'none'}
          />
          {state.likes}
        </button>

        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--text-muted)]">
          <IconMessage className="h-[17px] w-[17px]" />
          {post.comments}
        </span>
      </footer>
    </article>
  );
}
