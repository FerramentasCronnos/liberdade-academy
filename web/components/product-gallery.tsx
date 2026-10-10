'use client';

import Image from 'next/image';
import { useState } from 'react';
import { IconFlame } from './icons';

/** Foto principal com miniaturas; clicar numa miniatura troca a grande. */
export function ProductGallery({ images, name, isViral }: { images: string[]; name: string; isViral?: boolean }) {
  const list = images.length ? images : [];
  const [current, setCurrent] = useState(0);
  const active = list[current] ?? list[0];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[var(--bg-sunken)]">
        {active && (
          <Image src={active} alt={name} fill sizes="320px" className="object-cover" unoptimized />
        )}
        {isViral && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-[var(--color-gold-400)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink-900)]">
            <IconFlame className="h-3 w-3" />
            Viral
          </span>
        )}
        {list.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
            {current + 1}/{list.length}
          </span>
        )}
      </div>

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
    </div>
  );
}
