'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatCompact, formatPrice } from '@/lib/api';
import type { CreatorListItem } from '@/lib/queries';
import { CreatorFavoriteButton } from './creator-favorite-button';
import { IconSearch, IconStar, IconTrophy } from './icons';
import { Sparkline } from './sparkline';

type Tab = 'todos' | 'favoritos';
type SortId = 'ingresos' | 'crecimiento' | 'vendidos' | 'seguidores' | 'vistos' | 'engagement';

const SORTS: Array<{ id: SortId; label: string }> = [
  { id: 'ingresos', label: 'Mayores ingresos' },
  { id: 'crecimiento', label: 'Mayor crecimiento' },
  { id: 'vendidos', label: 'Más vendidos' },
  { id: 'seguidores', label: 'Más seguidores' },
  { id: 'vistos', label: 'Más vistos' },
  { id: 'engagement', label: 'Mayor engagement' },
];

/* Cores da marca para o avatar de iniciais; o hash do handle escolhe uma fixa por criador. */
const AVATAR_COLORS = ['#4b3fb0', '#d09a33', '#059669', '#47597a', '#3d3392', '#ab7a24'];

function avatarColor(handle: string) {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string, handle: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? handle).slice(0, 2);
  return letters.toUpperCase();
}


function GrowthBadge({ value }: { value?: number }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        up ? 'bg-[var(--money)]/12 text-[var(--money)]' : 'bg-[#d64545]/10 text-[#d64545]'
      }`}
    >
      {value > 0 ? '+' : ''}
      {Math.round(value)}%
    </span>
  );
}

function Avatar({ creator, size = 44 }: { creator: CreatorListItem; size?: number }) {
  if (creator.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={creator.avatar}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-display font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: avatarColor(creator.handle),
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials(creator.nickname, creator.handle)}
    </span>
  );
}

function RankNumber({ rank }: { rank: number }) {
  const podium = rank <= 3;
  return (
    <span
      className={`text-[15px] font-semibold tabular-nums ${
        podium ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'
      }`}
    >
      #{rank}
    </span>
  );
}

function TopProducts({ products, className }: { products: CreatorListItem['topProducts']; className?: string }) {
  if (!products.length)
    return <span className={`text-[12px] text-[var(--text-faint)] ${className ?? ''}`}>Sin productos aún</span>;
  return (
    <ul className={`flex flex-col gap-0.5 ${className ?? ''}`}>
      {products.slice(0, 3).map((p, i) => (
        <li key={`${p.name}-${i}`} className="truncate text-[12.5px] leading-snug">
          {p.productId ? (
            <Link
              href={`/catalogo/${p.productId}`}
              className="relative z-10 text-[var(--text)] hover:text-[var(--brand)] hover:underline"
              title={p.name}
            >
              {p.name}
            </Link>
          ) : (
            <span className="text-[var(--text-muted)]" title={p.name}>
              {p.name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Trend({ creator, width, height }: { creator: CreatorListItem; width: number; height: number }) {
  const points = creator.trend.map((p) => p.r);
  return (
    <div className="flex flex-col gap-0.5">
      <Sparkline points={points} width={width} height={height} label="Ingresos, últimos 30 días" />
      {points.length < 3 && (
        <span className="text-[10.5px] leading-tight text-[var(--text-faint)]">Se dibuja con cada actualización</span>
      )}
    </div>
  );
}

/*
 * Tabela só a partir de xl (1280px): com a barra lateral de 268px sobram ~960px,
 * e as trilhas mínimas somam ~900px. Engajamento e preço médio entram em 2xl;
 * antes disso ficam no cartão. Abaixo de xl vale o cartão (mobile/tablet).
 */
const COLS =
  'xl:grid-cols-[2rem_minmax(10rem,1.4fr)_minmax(6.5rem,1fr)_4.5rem_minmax(5.5rem,.9fr)_4.5rem_minmax(7rem,1fr)_6rem_2.5rem] 2xl:grid-cols-[2rem_minmax(10rem,1.4fr)_minmax(6.5rem,1fr)_4.5rem_minmax(5.5rem,.9fr)_4.5rem_minmax(7rem,1fr)_6rem_4rem_5rem_2.5rem]';

export function CreatorsRanking({ creators }: { creators: CreatorListItem[] }) {
  const [tab, setTab] = useState<Tab>('todos');
  const [sort, setSort] = useState<SortId>('ingresos');
  const [query, setQuery] = useState('');
  // Favoritos alterados nesta sessão: a aba e o contador reagem na hora, antes do servidor revalidar.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // 10 por página: a lista parece maior e cada página carrega menos
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const isFavorite = (c: CreatorListItem) => overrides[c.id] ?? c.favorite;
  const favoriteCount = creators.filter(isFavorite).length;

  // Posição do ranking é a da Kalodata, não a da ordenação escolhida.
  const rankOf = useMemo(() => new Map(creators.map((c, i) => [c.id, c.rank ?? i + 1])), [creators]);

  const all = useMemo(() => {
    let list = creators;
    if (tab === 'favoritos') list = list.filter((c) => overrides[c.id] ?? c.favorite);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.nickname.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          c.topProducts.some((p) => p.name.toLowerCase().includes(q)),
      );
    }

    const sorted = [...list];
    // Sem dado vai pro fim, não pro topo.
    const by = (pick: (c: CreatorListItem) => number | undefined) => (a: CreatorListItem, b: CreatorListItem) =>
      (pick(b) ?? -Infinity) - (pick(a) ?? -Infinity);
    switch (sort) {
      case 'crecimiento':
        sorted.sort(by((c) => c.revenueGrowth));
        break;
      case 'vendidos':
        sorted.sort(by((c) => c.salesCount));
        break;
      case 'seguidores':
        sorted.sort(by((c) => c.followers));
        break;
      case 'vistos':
        sorted.sort(by((c) => c.videoViews));
        break;
      case 'engagement':
        sorted.sort(by((c) => c.engagementRate));
        break;
      default:
        sorted.sort(by((c) => c.revenue));
    }
    return sorted;
  }, [creators, tab, sort, query, overrides]);

  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = all.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const changeAnd = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const changeAndTab = (value: Tab) => changeAnd(() => setTab(value));
  const changeAndSort = (value: SortId) => changeAnd(() => setSort(value));
  const changeAndQuery = (value: string) => changeAnd(() => setQuery(value));

  const favoriteButton = (c: CreatorListItem) => (
    <CreatorFavoriteButton
      creatorId={c.id}
      favorite={isFavorite(c)}
      compact
      onChange={(fav) => setOverrides((o) => ({ ...o, [c.id]: fav }))}
    />
  );

  return (
    <div className="px-4 pb-12 sm:px-8">
      {/* Abas */}
      <div className="mt-4 flex items-center gap-1 border-b border-[var(--border)]">
        {(
          [
            { id: 'todos', label: 'Todos', count: creators.length },
            { id: 'favoritos', label: 'Favoritos', count: favoriteCount },
          ] as Array<{ id: Tab; label: string; count: number }>
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => changeAndTab(t.id)}
              aria-pressed={active}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition ${
                active
                  ? 'border-[var(--brand)] text-[var(--text)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.id === 'favoritos' && <IconStar className="h-3.5 w-3.5 text-[var(--accent)]" />}
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  active ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'bg-[var(--bg-sunken)] text-[var(--text-faint)]'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ordenação + busca */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => changeAndSort(option.id)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[var(--shadow-soft)] transition ${
                sort === option.id
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 shadow-[var(--shadow-soft)] sm:w-72">
          <IconSearch className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
          <input
            type="search"
            aria-label="Buscar creador, @usuario o producto"
            value={query}
            onChange={(e) => changeAndQuery(e.target.value)}
            placeholder="Creador, @usuario o producto..."
            className="w-full appearance-none bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      </div>

      {all.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 px-5 py-16 text-center">
          <IconTrophy className="mx-auto h-8 w-8 text-[var(--text-faint)]" />
          <p className="mt-3 font-display text-lg font-semibold text-[var(--text)]">
            {creators.length === 0
              ? 'El ranking se llena con la próxima actualización'
              : tab === 'favoritos' && !query
                ? 'Todavía no guardaste creadores'
                : 'Ningún creador coincide con la búsqueda'}
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
            {creators.length === 0
              ? 'Los 50 creadores que más venden en TikTok Shop US aparecen aquí cada 2 días.'
              : tab === 'favoritos' && !query
                ? 'Toca la estrella de un creador para tenerlo a mano aquí.'
                : 'Prueba con otro nombre, @usuario o producto.'}
          </p>
        </div>
      ) : (
        <>
          {/* Cabeçalho da tabela (desktop) */}
          <div
            className={`mt-4 hidden grid-cols-1 items-end gap-x-3 px-4 pb-2 text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)] xl:grid ${COLS}`}
          >
            <span>#</span>
            <span>Creador</span>
            <span>Ingresos 30d</span>
            <span>Vendidos</span>
            <span>Seguidores</span>
            <span>Vistas</span>
            <span>Top productos</span>
            <span>Tendencia</span>
            <span className="hidden 2xl:block">Engag.</span>
            <span className="hidden 2xl:block">Precio prom.</span>
            <span className="sr-only">Guardar</span>
          </div>

          <ol className="mt-1 flex flex-col gap-2 xl:mt-0">
            {visible.map((c) => {
              const rank = rankOf.get(c.id) ?? 0;
              return (
                <li
                  key={c.id}
                  className="relative rounded-[20px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]"
                >
                  {/* Linha de tabela (md+) */}
                  <div className={`hidden grid-cols-1 items-center gap-x-3 px-4 py-3 xl:grid ${COLS}`}>
                    <RankNumber rank={rank} />

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar creator={c} size={40} />
                      <div className="min-w-0">
                        {/* O link do nome se estende pela linha inteira (after:inset-0); o resto sobe com z-10. */}
                        <Link
                          href={`/bank-offers/${c.id}`}
                          className="block truncate text-[14px] font-semibold text-[var(--text)] after:absolute after:inset-0 after:rounded-[20px] after:content-[''] hover:text-[var(--brand)]"
                        >
                          {c.nickname}
                        </Link>
                        <span className="block truncate text-[12px] text-[var(--text-muted)]">@{c.handle}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold tabular-nums text-[var(--money)]">
                        {formatPrice(c.revenue, c.currency)}
                      </p>
                      <GrowthBadge value={c.revenueGrowth} />
                    </div>

                    <span className="text-[13px] tabular-nums text-[var(--text)]">{formatCompact(c.salesCount)}</span>

                    <div className="min-w-0 text-[13px] tabular-nums">
                      <span className="text-[var(--text)]">{c.followers != null ? formatCompact(c.followers) : '—'}</span>
                      {c.newFollowers != null && c.newFollowers > 0 && (
                        <span className="block text-[11px] text-[var(--money)]">+{formatCompact(c.newFollowers)} nuevos</span>
                      )}
                    </div>

                    <span className="text-[13px] tabular-nums text-[var(--text)]">
                      {c.videoViews != null ? formatCompact(c.videoViews) : '—'}
                    </span>

                    <TopProducts products={c.topProducts} />

                    <Trend creator={c} width={112} height={36} />

                    <span className="hidden text-[13px] tabular-nums text-[var(--text)] 2xl:block">
                      {c.engagementRate != null ? `${c.engagementRate.toFixed(1)}%` : '—'}
                    </span>

                    <span className="hidden text-[13px] tabular-nums text-[var(--text)] 2xl:block">
                      {c.unitPrice != null ? formatPrice(c.unitPrice, c.currency) : '—'}
                    </span>

                    <div className="relative z-10 justify-self-end">{favoriteButton(c)}</div>
                  </div>

                  {/* Cartão (mobile) */}
                  <div className="p-4 xl:hidden">
                    <div className="flex items-start gap-3">
                      <Avatar creator={c} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <RankNumber rank={rank} />
                          <Link
                            href={`/bank-offers/${c.id}`}
                            className="truncate text-[15px] font-semibold text-[var(--text)] after:absolute after:inset-0 after:rounded-[20px] after:content-['']"
                          >
                            {c.nickname}
                          </Link>
                        </div>
                        <span className="block truncate text-[12.5px] text-[var(--text-muted)]">@{c.handle}</span>
                      </div>
                      <div className="relative z-10">{favoriteButton(c)}</div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Ingresos 30d</p>
                        <p className="text-[20px] font-semibold leading-tight tabular-nums text-[var(--money)]">
                          {formatPrice(c.revenue, c.currency)}
                        </p>
                        <div className="mt-1">
                          <GrowthBadge value={c.revenueGrowth} />
                        </div>
                      </div>
                      <Trend creator={c} width={120} height={40} />
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
                      <div className="rounded-xl bg-[var(--bg-sunken)] px-2.5 py-2">
                        <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Vendidos</dt>
                        <dd className="font-semibold tabular-nums text-[var(--text)]">{formatCompact(c.salesCount)}</dd>
                      </div>
                      <div className="rounded-xl bg-[var(--bg-sunken)] px-2.5 py-2">
                        <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Seguidores</dt>
                        <dd className="font-semibold tabular-nums text-[var(--text)]">
                          {c.followers != null ? formatCompact(c.followers) : '—'}
                        </dd>
                        {c.newFollowers != null && c.newFollowers > 0 && (
                          <dd className="text-[11px] text-[var(--money)]">+{formatCompact(c.newFollowers)} nuevos</dd>
                        )}
                      </div>
                      <div className="rounded-xl bg-[var(--bg-sunken)] px-2.5 py-2">
                        <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Vistas</dt>
                        <dd className="font-semibold tabular-nums text-[var(--text)]">
                          {c.videoViews != null ? formatCompact(c.videoViews) : '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--text-muted)]">
                      <span>
                        Engagement:{' '}
                        <strong className="text-[var(--text)]">
                          {c.engagementRate != null ? `${c.engagementRate.toFixed(1)}%` : '—'}
                        </strong>
                      </span>
                      <span>
                        Precio prom.:{' '}
                        <strong className="text-[var(--text)]">
                          {c.unitPrice != null ? formatPrice(c.unitPrice, c.currency) : '—'}
                        </strong>
                      </span>
                    </div>

                    <div className="mt-3">
                      <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Top productos</p>
                      <TopProducts products={c.topProducts} className="mt-1" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-[var(--text-faint)]">
              {all.length} creador{all.length === 1 ? '' : 'es'}
              {tab === 'favoritos' ? ' guardados' : ''} · página {current} de {pageCount}
            </p>
            {pageCount > 1 && (
              <nav className="flex items-center gap-1" aria-label="Páginas">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={current === 1}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:opacity-40"
                >
                  Anterior
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === current ? 'page' : undefined}
                    className={`h-8 w-8 rounded-full text-[12.5px] font-semibold transition ${
                      n === current
                        ? 'bg-[var(--brand)] text-white'
                        : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={current === pageCount}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:opacity-40"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}
