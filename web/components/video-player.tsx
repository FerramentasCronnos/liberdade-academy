'use client';

import Image from 'next/image';
import { useState } from 'react';
import { IconTikTok } from './icons';

/**
 * Capa com botão de play; o player oficial do TikTok só é carregado ao clicar.
 *
 * Carregar vários players de uma vez faz o TikTok bloquear o IP de quem está
 * vendo ("Access Denied" da Akamai). Assim cada pessoa só chama o TikTok para
 * o vídeo que de fato quer ver.
 */
export function VideoPlayer({
  videoId,
  title,
  cover,
  fallbackCover,
}: {
  videoId: string;
  title: string;
  /** Capa oficial do vídeo (pode faltar). */
  cover?: string;
  /** Foto do produto, usada quando não há capa. */
  fallbackCover: string;
}) {
  const [playing, setPlaying] = useState(false);
  const image = cover || fallbackCover;

  if (playing) {
    const params = new URLSearchParams({
      controls: '1',
      description: '1',
      music_info: '1',
      rel: '0',
      loop: '1',
      autoplay: '1',
    });
    return (
      <div className="relative aspect-[9/16] overflow-hidden rounded-[16px] bg-[var(--color-ink-900)]">
        <iframe
          src={`https://www.tiktok.com/player/v1/${videoId}?${params}`}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Reproducir: ${title}`}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-[16px] bg-[var(--color-ink-900)] text-left"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 33vw"
        className={`object-cover transition duration-300 group-hover:scale-[1.03] ${cover ? '' : 'opacity-60 blur-[1px]'}`}
        unoptimized
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/20" />
      <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--color-ink-900)] shadow-lg transition group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
        <IconTikTok className="h-3.5 w-3.5" />
        Reproducir en TikTok
      </span>
    </button>
  );
}
