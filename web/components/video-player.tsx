'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { IconTikTok } from './icons';

/**
 * Player oficial do TikTok que entra sozinho quando o card aparece na tela.
 *
 * Carregar todos os players da página de uma vez faz o TikTok bloquear o IP
 * de quem está vendo ("Access Denied" da Akamai). Por isso o iframe só é
 * montado quando o card está visível, no máximo MAX_ACTIVE ao mesmo tempo, e
 * é desmontado quando sai da tela. Quem fica fora da cota vê a capa com play e
 * pode clicar — o clique sempre abre, ignorando a cota.
 */
const MAX_ACTIVE = 3;
const active = new Set<string>();
const waiters = new Set<() => void>();

function acquire(key: string) {
  if (active.has(key)) return true;
  if (active.size >= MAX_ACTIVE) return false;
  active.add(key);
  return true;
}

function release(key: string) {
  if (!active.delete(key)) return;
  for (const wake of waiters) wake();
}

export function VideoPlayer({
  videoId,
  title,
  cover,
  fallbackCover,
  fallbackLabel,
  autoplay = true,
}: {
  videoId: string;
  title: string;
  /** Capa oficial do vídeo (pode faltar). */
  cover?: string;
  /** Foto do produto, usada quando não há capa. */
  fallbackCover?: string;
  /** Sem capa nem foto (perfil de criador): texto na capa escura, ex. "@handle". */
  fallbackLabel?: string;
  /** false = só toca ao clicar (comportamento antigo). */
  autoplay?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Cada instância tem a própria chave: o mesmo vídeo pode aparecer duas vezes.
  const key = useRef(`${videoId}:${Math.random().toString(36).slice(2)}`).current;
  const [inView, setInView] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [slot, setSlot] = useState(false);
  const image = cover || fallbackCover;

  useEffect(() => {
    if (!autoplay || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.6 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [autoplay]);

  useEffect(() => {
    if (!inView) {
      release(key);
      setSlot(false);
      setClicked(false);
      return;
    }
    if (acquire(key)) {
      setSlot(true);
      return;
    }
    const wake = () => {
      if (acquire(key)) {
        waiters.delete(wake);
        setSlot(true);
      }
    };
    waiters.add(wake);
    return () => {
      waiters.delete(wake);
    };
  }, [inView, key]);

  useEffect(() => () => release(key), [key]);

  const playing = clicked || (autoplay && inView && slot);

  return (
    <div ref={ref} className="relative aspect-[9/16] overflow-hidden rounded-[16px] bg-[var(--color-ink-900)]">
      <button
        type="button"
        onClick={() => setClicked(true)}
        aria-label={`Reproducir: ${title}`}
        className="group absolute inset-0 block h-full w-full text-left"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className={`object-cover transition duration-300 group-hover:scale-[1.03] ${cover ? '' : 'opacity-60 blur-[1px]'}`}
            unoptimized
          />
        ) : (
          // Capa escura: a Kalodata não traz thumbnail e o criador não tem foto de produto.
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--color-ink-800)] to-[var(--color-ink-950)] text-white/80">
            <IconTikTok className="h-10 w-10" />
            {fallbackLabel && <span className="px-4 text-center text-[12.5px] font-semibold">{fallbackLabel}</span>}
          </span>
        )}
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

      {playing && (
        <iframe
          src={`https://www.tiktok.com/player/v1/${videoId}?${PLAYER_PARAMS}`}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}

const PLAYER_PARAMS = new URLSearchParams({
  controls: '1',
  description: '1',
  music_info: '1',
  rel: '0',
  loop: '1',
  autoplay: '1',
}).toString();
