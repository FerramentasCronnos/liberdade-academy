'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowButton, Lightbox } from './lightbox';

/**
 * Carrossel de prints de um marco da linha do tempo: arrasta para o lado
 * (ou usa as setas) e clica para ver em tela cheia.
 */
export function PrintCarousel({ images, title }: { images: string[]; title: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [images.length]);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (images.length === 0) {
    return (
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid h-[220px] w-[160px] shrink-0 place-items-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-sunken)] px-3 text-center text-[12px] text-[var(--text-faint)]"
          >
            Print {i + 1}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div ref={track} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(index)}
            aria-label={`Ver print ${index + 1} de ${images.length}`}
            className="group h-[220px] w-auto max-w-[85%] shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] sm:h-[260px] sm:max-w-[460px]"
          >
            {/* Altura fixa e largura pela proporção do print: painéis deitados e telas de celular aparecem inteiros. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-auto max-w-none object-cover object-left-top transition duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {images.length > 1 && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--text-faint)]">
            {images.length} prints · toca para ampliar
          </p>
          {!(edges.start && edges.end) && (
            <div className="flex gap-2">
              <span className={edges.start ? 'pointer-events-none opacity-40' : ''}>
                <ArrowButton side="left" variant="light" onClick={() => scroll(-1)} />
              </span>
              <span className={edges.end ? 'pointer-events-none opacity-40' : ''}>
                <ArrowButton side="right" variant="light" onClick={() => scroll(1)} />
              </span>
            </div>
          )}
        </div>
      )}

      {open != null && (
        <Lightbox
          images={images}
          index={open}
          label={title}
          caption={title}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
