'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from './product-card';
import { CATEGORY_ICONS } from './category-icons';
import { IconChevronDown, IconSearch, IconSort } from './icons';
import {
  CATEGORIES,
  COMMISSION_FILTERS,
  GROWTH_FILTERS,
  MARKETPLACES,
  PRICE_FILTERS,
  REVENUE_FILTERS,
  SOLD_FILTERS,
  SORTS,
  type CategoryId,
  type Marketplace,
  type Product,
  type RangeOption,
  type SortId,
} from '@/lib/types';

/** true quando o valor cai na faixa; sem valor só passa na opção "todos". */
function inRange(option: RangeOption, value: number | null | undefined) {
  if (option.min == null && option.max == null) return true;
  if (value == null) return false;
  if (option.min != null && value < option.min) return false;
  if (option.max != null && value >= option.max) return false;
  return true;
}

function RangeSelect({ options, value, onChange }: { options: RangeOption[]; value: string; onChange: (id: string) => void }) {
  const active = value !== 'todos';
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none rounded-full border px-4 py-2.5 pr-8 text-[13px] font-medium shadow-[var(--shadow-soft)] outline-none transition bg-[length:14px] bg-[right_10px_center] bg-no-repeat ${
        active
          ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
      }`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
      }}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CatalogView({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<CategoryId>('todos');
  const [marketplace, setMarketplace] = useState<Marketplace | 'todos'>('todos');
  const [sort, setSort] = useState<SortId>('novedades');
  const [query, setQuery] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [revenue, setRevenue] = useState('todos');
  const [growth, setGrowth] = useState('todos');
  const [sold, setSold] = useState('todos');
  const [commission, setCommission] = useState('todos');
  const [price, setPrice] = useState('todos');

  const hasMetrics = useMemo(() => products.some((p) => p.metrics), [products]);
  const filtersActive = [revenue, growth, sold, commission, price].some((v) => v !== 'todos');

  const visible = useMemo(() => {
    let list = products;

    if (category !== 'todos') list = list.filter((p) => p.category === category);
    if (marketplace !== 'todos') list = list.filter((p) => p.marketplace === marketplace);

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));

    const revenueOpt = REVENUE_FILTERS.find((o) => o.id === revenue)!;
    const growthOpt = GROWTH_FILTERS.find((o) => o.id === growth)!;
    const soldOpt = SOLD_FILTERS.find((o) => o.id === sold)!;
    const commissionOpt = COMMISSION_FILTERS.find((o) => o.id === commission)!;
    const priceOpt = PRICE_FILTERS.find((o) => o.id === price)!;
    list = list.filter(
      (p) =>
        inRange(revenueOpt, p.metrics?.revenue) &&
        inRange(growthOpt, p.metrics?.revenueGrowth) &&
        inRange(soldOpt, p.salesCount) &&
        inRange(commissionOpt, p.commission ?? p.commissionEstimated) &&
        inRange(priceOpt, p.metrics?.unitPrice ?? p.price),
    );

    const sorted = [...list];
    switch (sort) {
      case 'ingresos':
        sorted.sort((a, b) => (b.metrics?.revenue ?? -1) - (a.metrics?.revenue ?? -1));
        break;
      case 'crecimiento':
        sorted.sort((a, b) => (b.metrics?.revenueGrowth ?? -Infinity) - (a.metrics?.revenueGrowth ?? -Infinity));
        break;
      case 'preco_asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'preco_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'avaliacao':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'comissao':
        // produtos sem comissão informada vão pro fim, não pro topo
        sorted.sort((a, b) => (b.commissionValue ?? -1) - (a.commissionValue ?? -1));
        break;
      case 'novedades':
        // recém-chegados no topo (mais novo primeiro); o resto por vendas
        sorted.sort((a, b) => {
          if (Boolean(a.isNew) !== Boolean(b.isNew)) return a.isNew ? -1 : 1;
          if (a.isNew && b.isNew) return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
          return b.salesCount - a.salesCount;
        });
        break;
      default:
        sorted.sort((a, b) => b.salesCount - a.salesCount);
    }
    return sorted;
  }, [products, category, marketplace, sort, query, revenue, growth, sold, commission, price]);

  const sortLabel = SORTS.find((s) => s.id === sort)?.label ?? 'Ordenar';

  return (
    <div className="px-5 pb-10 sm:px-8">
      {/* Categorias em discos */}
      <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-2 pt-4 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          const Icon = CATEGORY_ICONS[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              aria-pressed={active}
              className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={`grid h-[62px] w-[62px] place-items-center rounded-full transition duration-200 ${
                  active
                    ? 'bg-[var(--brand)] text-white shadow-[0_10px_24px_-10px_var(--brand)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft)] hover:text-[var(--brand)]'
                }`}
              >
                <Icon className="h-[26px] w-[26px]" />
              </span>
              <span
                className={`text-[11.5px] leading-tight font-medium ${
                  active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-medium text-[var(--text)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)]"
          >
            <IconSort className="h-4 w-4 text-[var(--text-faint)]" />
            {sortLabel}
            <IconChevronDown className={`h-4 w-4 transition ${sortOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-lift)]">
                {SORTS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSort(option.id);
                      setSortOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2 text-left text-[13px] transition hover:bg-[var(--bg-sunken)] ${
                      sort === option.id
                        ? 'font-semibold text-[var(--text)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMarketplace('todos')}
          className={`rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[var(--shadow-soft)] transition ${
            marketplace === 'todos'
              ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
              : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
          }`}
        >
          Todos
        </button>

        {MARKETPLACES.map((mp) => {
          const active = marketplace === mp.id;
          return (
            <button
              key={mp.id}
              type="button"
              disabled={!mp.available}
              onClick={() => setMarketplace(mp.id)}
              title={mp.available ? undefined : 'Integración aún no disponible'}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[var(--shadow-soft)] transition ${
                active
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
              } ${mp.available ? '' : 'cursor-not-allowed opacity-45 hover:border-[var(--border)]'}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: mp.color }}
                aria-hidden
              />
              {mp.label}
              {!mp.available && (
                <span className="text-[9.5px] font-semibold uppercase tracking-wider opacity-70">
                  pronto
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 shadow-[var(--shadow-soft)] sm:w-72">
          <IconSearch className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      {/* Filtros por datos de venta (Kalodata) */}
      {hasMetrics && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <RangeSelect options={REVENUE_FILTERS} value={revenue} onChange={setRevenue} />
          <RangeSelect options={GROWTH_FILTERS} value={growth} onChange={setGrowth} />
          <RangeSelect options={SOLD_FILTERS} value={sold} onChange={setSold} />
          <RangeSelect options={COMMISSION_FILTERS} value={commission} onChange={setCommission} />
          <RangeSelect options={PRICE_FILTERS} value={price} onChange={setPrice} />
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setRevenue('todos');
                setGrowth('todos');
                setSold('todos');
                setCommission('todos');
                setPrice('todos');
              }}
              className="text-[12.5px] font-medium text-[var(--text-muted)] underline-offset-2 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
          <span className="ml-auto text-[12px] text-[var(--text-faint)]">
            {visible.length} producto{visible.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-20 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text)]">
            Ningún producto encontrado
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
            Ajusta los filtros o prueba otro término de búsqueda.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
