'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatCompact, formatPrice } from '@/lib/api';
import type { ReferenceVideoView } from '@/lib/queries';
import { CATEGORIES, CATEGORY_LABEL, type CategoryId } from '@/lib/types';
import { CATEGORY_ICONS } from './category-icons';
import { IconExternal, IconHeart, IconSearch, IconTikTok } from './icons';

type SortId = 'ventas' | 'views' | 'recientes';
const SORTS: Array<{ id: SortId; label: string }> = [
  { id: 'ventas', label: 'Más ventas' },
  { id: 'views', label: 'Más vistos' },
  { id: 'recientes', label: 'Más recientes' },
];
const PAGE = 24;

function playerUrl(videoId: string) {
  const params = new URLSearchParams({ controls: '1', description: '1', music_info: '1', rel: '0', loop: '1' });
  return `https://www.tiktok.com/player/v1/${videoId}?${params}`;
}

export function BankOffersView({ videos }: { videos: ReferenceVideoView[] }) {
  const [category, setCategory] = useState<CategoryId>('todos');
  const [sort, setSort] = useState<SortId>('ventas');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const visible = useMemo(() => {
    let list = videos;
    if (category !== 'todos') list = list.filter((v) => v.product.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.product.name.toLowerCase().includes(q) ||
          v.creatorHandle.toLowerCase().includes(q) ||
          v.title.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === 'views') sorted.sort((a, b) => b.views - a.views);
    else if (sort === 'recientes') sorted.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
    else sorted.sort((a, b) => b.revenue - a.revenue);
    return sorted;
  }, [videos, category, sort, query]);

  const page = visible.slice(0, shown);

  return (
    <div className="px-5 pb-12 sm:px-8">
      <div className="mt-4 rounded-[20px] border border-[var(--brand)]/25 bg-[var(--violet-soft)] px-5 py-4">
        <p className="text-[14px] leading-relaxed text-[var(--text)]">
          Este es un espacio de <strong>inspiración y referencias</strong>: mira cómo los creadores que más
          venden presentan cada producto y haz <strong>tu propia versión</strong>.
        </p>
        <p className="mt-1 text-[12.5px] italic text-[var(--text-muted)]">
          Los videos pertenecen a sus creadores. Copiarlos es plagio: inspírate y hazlo mejor.
        </p>
      </div>

      {/* Categorias */}
      <div className="no-scrollbar -mx-5 mt-4 flex gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          const Icon = CATEGORY_ICONS[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id);
                setShown(PAGE);
              }}
              aria-pressed={active}
              className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={`grid h-[54px] w-[54px] place-items-center rounded-full transition ${
                  active
                    ? 'bg-[var(--brand)] text-white shadow-[0_10px_24px_-10px_var(--brand)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft)] hover:text-[var(--brand)]'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span className={`text-[11.5px] font-medium leading-tight ${active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ordenação + busca */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SORTS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSort(option.id)}
            className={`rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[var(--shadow-soft)] transition ${
              sort === option.id
                ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
                : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
            }`}
          >
            {option.label}
          </button>
        ))}
        <div className="ml-auto flex w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 shadow-[var(--shadow-soft)] sm:w-72">
          <IconSearch className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Producto, creador o tema..."
            className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>
        <span className="w-full text-[12px] text-[var(--text-faint)] sm:w-auto">
          {visible.length} video{visible.length === 1 ? '' : 's'}
        </span>
      </div>

      {page.length === 0 ? (
        <div className="mt-10 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-20 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text)]">Todavía no hay videos aquí</p>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
            Los videos llegan con la actualización diaria del catálogo. Prueba otra categoría o búsqueda.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {page.map((video) => (
            <article
              key={video.id}
              className="flex flex-col overflow-hidden rounded-[22px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]"
            >
              <div className="relative m-2 aspect-[9/16] overflow-hidden rounded-[16px] bg-[var(--color-ink-900)]">
                <iframe
                  src={playerUrl(video.videoId)}
                  title={video.title || `Video de @${video.creatorHandle}`}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  allow="fullscreen; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-ink-900)] text-white">
                    <IconTikTok className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`https://www.tiktok.com/@${video.creatorHandle}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate text-[13.5px] font-semibold text-[var(--text)] hover:underline"
                    >
                      @{video.creatorHandle}
                    </a>
                    <p className="text-[11px] text-[var(--text-faint)]">
                      {video.publishedAt ?? ''}
                      {video.isAd ? ' · con anuncio' : ''}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Ventas est." value={formatPrice(video.revenue, video.product.currency)} />
                  <Stat label="Views" value={formatCompact(video.views)} />
                  <Stat label="Likes" value={formatCompact(video.likes)} icon={<IconHeart className="h-3 w-3" />} />
                </dl>

                <Link
                  href={`/catalogo/${video.product.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-2 transition hover:border-[var(--brand)]"
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-sunken)]">
                    <Image src={video.product.image} alt="" fill sizes="44px" className="object-cover" unoptimized />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-[var(--text)]">{video.product.name}</span>
                    <span className="text-[11px] text-[var(--brand)]">
                      {CATEGORY_LABEL[video.product.category] ?? video.product.category} · ver oferta
                    </span>
                  </span>
                </Link>

                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-ink-900)] px-3 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
                >
                  Ver en TikTok
                  <IconExternal className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {visible.length > shown && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-2.5 text-[13.5px] font-semibold text-[var(--text)] shadow-[var(--shadow-soft)] transition hover:border-[var(--brand)]"
          >
            Cargar más ({visible.length - shown} restantes)
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--bg-sunken)] px-2 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</dt>
      <dd className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--text)]">
        {icon}
        {value}
      </dd>
    </div>
  );
}
