'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { IconFlame, IconX } from './icons';

/**
 * Foto principal com miniaturas; clicar numa miniatura troca a grande e
 * clicar na grande abre o visor em tela cheia, com setas e teclado.
 */
export function ProductGallery({ images, name, isViral }: { images: string[]; name: string; isViral?: boolean }) {
  const list = images.length ? images : [];
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const active = list[current] ?? list[0];

  const go = useCallback(
    (delta: number) => setCurrent((index) => (index + delta + list.length) % list.length),
    [list.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, go]);

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => active && setOpen(true)}
        aria-label="Ver foto en grande"
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-[18px] bg-[var(--bg-sunken)] text-left"
      >
        {active && (
          <Image src={active} alt={name} fill sizes="320px" className="object-cover transition duration-300 group-hover:scale-[1.03]" unoptimized />
        )}
        {isViral && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-[var(--color-gold-400)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink-900)]">
            <IconFlame className="h-3 w-3" />
            Viral
          </span>
        )}
        <span className="absolute bottom-3 right-3 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
          {list.length > 1 ? `${current + 1}/${list.length} · ` : ''}ampliar
        </span>
      </button>

      {list.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {list.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Foto ${index + 1}`}
              aria-pressed={index === current}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                index === current ? 'border-[var(--brand)]' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={src} alt="" fill sizes="56px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}

      {open && active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
          >
            <IconX className="h-5 w-5" />
          </button>

          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-6"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-6"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </>
          )}

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-[85vh] w-full max-w-[1100px]"
          >
            <Image src={active} alt={name} fill sizes="100vw" className="object-contain" unoptimized priority />
          </div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-medium text-white">
            {current + 1} / {list.length}
          </p>
        </div>
      )}
    </div>
  );
}
