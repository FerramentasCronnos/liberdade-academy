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


/* -------------------------------------------------------------- filtros */

type Range = { id: string; label: string; min?: number; max?: number };
type FilterDef = { key: FilterKey; label: string; options: Range[]; pick: (c: CreatorListItem) => number | string | undefined };
type FilterKey = 'category' | 'revenue' | 'growth' | 'followers' | 'engagement' | 'views' | 'price' | 'source' | 'account';

const CATEGORY_OPTIONS: Range[] = [
  { id: 'todos', label: 'Categoría: todas' },
  { id: 'beleza', label: 'Belleza' },
  { id: 'saude', label: 'Salud' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'moda', label: 'Moda' },
  { id: 'casa', label: 'Casa y Cocina' },
  { id: 'tech', label: 'Electrónicos' },
  { id: 'fisico', label: 'Otros' },
];

const FILTERS: FilterDef[] = [
  { key: 'category', label: 'Categoría', options: CATEGORY_OPTIONS, pick: (c) => c.category },
  {
    key: 'revenue',
    label: 'Ingresos',
    options: [
      { id: 'todos', label: 'Ingresos: todos' },
      { id: '100k', label: 'Ingresos ≥ $100K', min: 100_000 },
      { id: '500k', label: 'Ingresos ≥ $500K', min: 500_000 },
      { id: '1m', label: 'Ingresos ≥ $1M', min: 1_000_000 },
    ],
    pick: (c) => c.revenue,
  },
  {
    key: 'growth',
    label: 'Crecimiento',
    options: [
      { id: 'todos', label: 'Crecimiento: todos' },
      { id: 'up', label: 'En crecimiento', min: 0.000001 },
      { id: '25', label: 'Crecimiento ≥ 25%', min: 25 },
      { id: '50', label: 'Crecimiento ≥ 50%', min: 50 },
      { id: 'down', label: 'En caída', max: 0 },
    ],
    pick: (c) => c.revenueGrowth,
  },
  {
    key: 'followers',
    label: 'Seguidores',
    options: [
      { id: 'todos', label: 'Seguidores: todos' },
      { id: 'lt100k', label: 'Menos de 100K', max: 100_000 },
      { id: '100k-500k', label: '100K – 500K', min: 100_000, max: 500_000 },
      { id: '500k-1m', label: '500K – 1M', min: 500_000, max: 1_000_000 },
      { id: 'gt1m', label: 'Más de 1M', min: 1_000_000 },
    ],
    pick: (c) => c.followers,
  },
  {
    key: 'engagement',
    label: 'Engagement',
    options: [
      { id: 'todos', label: 'Engagement: todos' },
      { id: '1', label: 'Engagement ≥ 1%', min: 1 },
      { id: '3', label: 'Engagement ≥ 3%', min: 3 },
      { id: '5', label: 'Engagement ≥ 5%', min: 5 },
    ],
    pick: (c) => c.engagementRate,
  },
  {
    key: 'views',
    label: 'Vistas',
    options: [
      { id: 'todos', label: 'Vistas: todas' },
      { id: '1m', label: 'Vistas ≥ 1M', min: 1_000_000 },
      { id: '10m', label: 'Vistas ≥ 10M', min: 10_000_000 },
      { id: '50m', label: 'Vistas ≥ 50M', min: 50_000_000 },
    ],
    pick: (c) => c.videoViews,
  },
  {
    key: 'price',
    label: 'Precio medio',
    options: [
      { id: 'todos', label: 'Precio medio: todos' },
      { id: 'lt30', label: 'Menos de $30', max: 30 },
      { id: '30-100', label: '$30 – $100', min: 30, max: 100 },
      { id: 'gt100', label: 'Más de $100', min: 100 },
    ],
    pick: (c) => c.unitPrice,
  },
  {
    key: 'source',
    label: 'Fuente de ingresos',
    options: [
      { id: 'todos', label: 'Fuente: todas' },
      { id: 'video', label: 'Principalmente videos' },
      { id: 'live', label: 'Principalmente lives' },
      { id: 'haslive', label: 'Con ingresos en vivo' },
    ],
    pick: (c) => {
      const video = c.videoRevenue ?? 0;
      const live = c.liveRevenue ?? 0;
      if (live > 0 && live >= video) return 'live';
      if (live > 0) return 'haslive';
      return video > 0 ? 'video' : undefined;
    },
  },
  {
    key: 'account',
    label: 'Tipo de cuenta',
    options: [
      { id: 'todos', label: 'Cuenta: todas' },
      { id: 'independent', label: 'Independiente' },
      { id: 'shop', label: 'Vinculada a tienda' },
    ],
    pick: (c) => (c.status ? (c.status.toUpperCase() === 'INDEPENDENT' ? 'independent' : 'shop') : undefined),
  },
];

const NO_FILTERS: Record<FilterKey, string> = {
  category: 'todos',
  revenue: 'todos',
  growth: 'todos',
  followers: 'todos',
  engagement: 'todos',
  views: 'todos',
  price: 'todos',
  source: 'todos',
  account: 'todos',
};

/** Sem valor no criador só passa em "todos". Opções textuais comparam pelo id; "haslive" aceita live também. */
function passes(def: FilterDef, optionId: string, c: CreatorListItem) {
  if (optionId === 'todos') return true;
  const option = def.options.find((o) => o.id === optionId);
  if (!option) return true;
  const value = def.pick(c);
  if (value == null) return false;
  if (typeof value === 'string') {
    if (optionId === 'haslive') return value === 'haslive' || value === 'live';
    return value === optionId;
  }
  if (option.min != null && value < option.min) return false;
  if (option.max != null && value >= option.max) return false;
  return true;
}

function FilterSelect({ def, value, onChange }: { def: FilterDef; value: string; onChange: (id: string) => void }) {
  const active = value !== 'todos';
  return (
    <select
      aria-label={def.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none rounded-full border py-2 pl-3.5 pr-8 text-[12.5px] font-medium shadow-[var(--shadow-soft)] outline-none transition bg-[length:14px] bg-[right_10px_center] bg-no-repeat ${
        active
          ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
      }`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
      }}
    >
      {def.options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CreatorsRanking({ creators }: { creators: CreatorListItem[] }) {
  const [tab, setTab] = useState<Tab>('todos');
  const [sort, setSort] = useState<SortId>('ingresos');
  const [query, setQuery] = useState('');
  // Favoritos alterados nesta sessão: a aba e o contador reagem na hora, antes do servidor revalidar.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // 10 por página: a lista parece maior e cada página carrega menos
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<FilterKey, string>>(NO_FILTERS);
  const activeFilters = (Object.keys(filters) as FilterKey[]).filter((k) => filters[k] !== 'todos').length;

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

    list = list.filter((c) => FILTERS.every((def) => passes(def, filters[def.key], c)));

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
  }, [creators, tab, sort, query, overrides, filters]);

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
  const changeFilter = (key: FilterKey, value: string) => changeAnd(() => setFilters((f) => ({ ...f, [key]: value })));

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

      {/* Filtros (estilo painel da Kalodata) */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {FILTERS.map((def) => (
          <FilterSelect key={def.key} def={def} value={filters[def.key]} onChange={(v) => changeFilter(def.key, v)} />
        ))}
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => changeAnd(() => setFilters(NO_FILTERS))}
            className="text-[12.5px] font-medium text-[var(--text-muted)] underline-offset-2 hover:underline"
          >
            Limpiar filtros ({activeFilters})
          </button>
        )}
      </div>

      {all.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 px-5 py-16 text-center">
          <IconTrophy className="mx-auto h-8 w-8 text-[var(--text-faint)]" />
          <p className="mt-3 font-display text-lg font-semibold text-[var(--text)]">
            {creators.length === 0
              ? 'El ranking se llena con la próxima actualización'
              : tab === 'favoritos' && !query
                ? 'Todavía no guardaste creadores'
                : activeFilters > 0
                  ? 'Ningún creador coincide con los filtros'
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
