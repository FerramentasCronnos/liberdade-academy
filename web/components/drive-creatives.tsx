'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DriveFile } from '@/lib/drive-folder';
import { IconDownload, IconExternal, IconX } from './icons';

/**
 * Galeria dos criativos: miniatura de cada arquivo do Drive; o clique abre o
 * preview do próprio Drive numa janela sobre o catálogo, com botão de baixar.
 */
export function DriveCreatives({ files, folderUrl }: { files: DriveFile[]; folderUrl: string }) {
  const [current, setCurrent] = useState<number | null>(null);
  const file = current == null ? null : files[current];

  const close = useCallback(() => setCurrent(null), []);
  const step = useCallback(
    (delta: number) => setCurrent((i) => (i == null ? i : (i + delta + files.length) % files.length)),
    [files.length],
  );

  useEffect(() => {
    if (current == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [current, close, step]);

  return (
    <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13.5px] font-semibold text-[var(--text)]">🎬 Creativos de esta oferta</p>
          <p className="text-[11.5px] text-[var(--text-faint)]">
            {files.length} {files.length === 1 ? 'archivo' : 'archivos'} · haz clic para ver y descargar
          </p>
        </div>
        <a
          href={folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--brand)] hover:underline"
        >
          Abrir carpeta en Drive
          <IconExternal className="h-3.5 w-3.5" />
        </a>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setCurrent(index)}
              className="group block w-full text-left"
              aria-label={`Ver ${item.name}`}
            >
              <span className="relative block aspect-[9/16] overflow-hidden rounded-[14px] bg-[var(--color-ink-900)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura servida pelo Drive */}
                <img
                  src={item.thumbnail}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                {item.kind === 'video' && (
                  <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--color-ink-900)] shadow-lg transition group-hover:scale-105">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                  </span>
                )}
                <span className="absolute bottom-2 left-2 right-2 truncate text-[11px] font-semibold text-white">
                  {item.name.replace(/\.[a-z0-9]+$/i, '')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {file && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={file.name}
          onClick={close}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex w-full max-w-[960px] flex-col gap-3 rounded-[20px] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-lift)] sm:p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[13.5px] font-semibold text-[var(--text)]">{file.name}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
                >
                  <IconDownload className="h-4 w-4" />
                  Descargar
                </a>
                <a
                  href={file.openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir en Drive"
                  className="grid h-8 w-8 place-items-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
                >
                  <IconExternal className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar"
                  className="grid h-8 w-8 place-items-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative h-[min(72vh,720px)] w-full overflow-hidden rounded-[14px] bg-black">
              <iframe
                key={file.id}
                src={file.previewUrl}
                title={file.name}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
              />
            </div>

            {files.length > 1 && (
              <div className="flex items-center justify-between text-[12.5px] text-[var(--text-muted)]">
                <button type="button" onClick={() => step(-1)} className="rounded-lg px-2 py-1 font-semibold hover:bg-[var(--bg)]">
                  ← Anterior
                </button>
                <span>
                  {current! + 1} / {files.length}
                </span>
                <button type="button" onClick={() => step(1)} className="rounded-lg px-2 py-1 font-semibold hover:bg-[var(--bg)]">
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
