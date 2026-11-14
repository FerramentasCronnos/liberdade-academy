'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconX } from './icons';

const ZOOMS = [1, 1.5, 2, 3, 4];
const CLICK_ZOOM = 2.5;

/**
 * Visor em tela cheia com setas, teclado (← → Esc, + −), contador e zoom:
 * clicar na imagem aproxima no ponto clicado (clicar de novo afasta) e, com
 * zoom, dá para arrastar para ver o resto. Usado pela galeria do produto e
 * pelos prints da linha do tempo.
 */
export function Lightbox({
  images,
  index,
  label,
  caption,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  label: string;
  caption?: string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** Ponto (fração da imagem) que deve ficar no centro depois de mudar o zoom. */
  const focus = useRef<{ fx: number; fy: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);

  const go = useCallback(
    (delta: number) => onIndex((index + delta + images.length) % images.length),
    [index, images.length, onIndex],
  );

  // Troca de imagem: volta ao tamanho normal (ajuste durante a renderização, sem efeito).
  const [shown, setShown] = useState(index);
  if (shown !== index) {
    setShown(index);
    setZoom(1);
    setNatural(null);
  }

  // Tamanho da área de exibição.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setZoomAt = useCallback((next: number, fx = 0.5, fy = 0.5) => {
    focus.current = { fx, fy };
    setZoom(Math.min(ZOOMS[ZOOMS.length - 1], Math.max(1, next)));
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = stage.current;
      // mantém o centro da área visível
      let fx = 0.5;
      let fy = 0.5;
      if (el && el.scrollWidth > 0) {
        fx = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth;
        fy = (el.scrollTop + el.clientHeight / 2) / el.scrollHeight;
      }
      const i = ZOOMS.findIndex((z) => z >= zoom - 1e-6);
      const next = dir > 0 ? ZOOMS[Math.min(ZOOMS.length - 1, (ZOOMS[i] > zoom ? i : i + 1))] : ZOOMS[Math.max(0, i - 1)];
      setZoomAt(next, fx, fy);
    },
    [zoom, setZoomAt],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === '+' || event.key === '=') step(1);
      if (event.key === '-') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose, step]);

  // Tamanho da imagem: cabe inteira na área (zoom 1) e cresce a partir disso.
  const fit = natural && box.w && box.h ? Math.min(box.w / natural.w, box.h / natural.h, 1.5) : 0;
  const width = natural ? natural.w * fit * zoom : 0;
  const height = natural ? natural.h * fit * zoom : 0;

  // Depois de mudar o zoom, rola para manter o ponto escolhido no centro.
  useLayoutEffect(() => {
    const el = stage.current;
    const f = focus.current;
    if (!el || !f) return;
    focus.current = null;
    el.scrollLeft = Math.max(0, f.fx * el.scrollWidth - el.clientWidth / 2);
    el.scrollTop = Math.max(0, f.fy * el.scrollHeight - el.clientHeight / 2);
  }, [zoom, width, height]);

  const active = images[index];
  if (!active) return null;
  const zoomed = zoom > 1;

  const onPointerDown = (event: React.PointerEvent) => {
    const el = stage.current;
    if (!el || event.pointerType === 'touch') return; // no celular, o próprio dedo rola
    drag.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const el = stage.current;
    const d = drag.current;
    if (!el || !d) return;
    if (event.buttons !== 1) return void (drag.current = null);
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (zoomed) {
      el.scrollLeft = d.left - dx;
      el.scrollTop = d.top - dy;
    }
  };
  const onImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    const moved = drag.current?.moved;
    drag.current = null;
    if (moved) return;
    if (zoomed) return setZoomAt(1);
    const rect = event.currentTarget.getBoundingClientRect();
    setZoomAt(CLICK_ZOOM, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm"
    >
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => (drag.current = null)}
        onClick={(event) => {
          // Fora da imagem: com zoom ou depois de arrastar, não fecha.
          const moved = drag.current?.moved;
          drag.current = null;
          if (zoomed || moved) event.stopPropagation();
        }}
        className={`absolute inset-x-0 bottom-16 top-16 sm:inset-x-20 ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}
      >
        <div className="flex min-h-full min-w-full items-center justify-center" style={zoomed ? { width: Math.max(width, box.w), height: Math.max(height, box.h) } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active}
            src={active}
            alt={label}
            draggable={false}
            ref={(el) => {
              // Imagem já carregada (cache) antes da página ficar interativa: o onLoad não dispara.
              if (el?.complete && el.naturalWidth && !natural) setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            onLoad={(event) => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
            onClick={onImageClick}
            style={natural ? { width, height, maxWidth: 'none' } : { maxWidth: '100%', maxHeight: '100%' }}
            className={`select-none ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
      >
        <IconX className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <>
          <ArrowButton side="left" onClick={() => go(-1)} />
          <ArrowButton side="right" onClick={() => go(1)} />
        </>
      )}

      <div
        onClick={(event) => event.stopPropagation()}
        className="absolute bottom-4 left-1/2 flex max-w-[92vw] -translate-x-1/2 items-center gap-2"
      >
        <ZoomButton label="Alejar" disabled={zoom <= 1} onClick={() => step(-1)}>
          −
        </ZoomButton>
        <p className="truncate rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-medium text-white">
          {caption ? `${caption} · ` : ''}
          {index + 1} / {images.length}
          {zoomed ? ` · ${Math.round(zoom * 100)}%` : ''}
        </p>
        <ZoomButton label="Acercar" disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => step(1)}>
          +
        </ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-[18px] font-semibold leading-none text-white transition hover:bg-white/30 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function ArrowButton({
  side,
  onClick,
  variant = 'dark',
}: {
  side: 'left' | 'right';
  onClick: () => void;
  variant?: 'dark' | 'light';
}) {
  const position = side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6';
  const look =
    variant === 'dark'
      ? `absolute ${position} z-10 h-11 w-11 bg-white/15 text-white hover:bg-white/30`
      : 'h-9 w-9 border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--brand)] hover:text-[var(--brand)]';
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={side === 'left' ? 'Anterior' : 'Siguiente'}
      className={`${variant === 'dark' ? 'top-1/2 -translate-y-1/2' : ''} grid place-items-center rounded-full transition ${look}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={side === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </svg>
    </button>
  );
}
