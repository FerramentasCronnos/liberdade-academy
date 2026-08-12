'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from './product-card';
import { CATEGORY_ICONS } from './category-icons';
import { IconChevronDown, IconSearch, IconSort } from './icons';
import {
  CATEGORIES,
  MARKETPLACES,
  SORTS,
  type CategoryId,
  type Marketplace,
  type Product,
  type SortId,
} from '@/lib/types';

export function CatalogView({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<CategoryId>('todos');
  const [marketplace, setMarketplace] = useState<Marketplace | 'todos'>('todos');
  const [sort, setSort] = useState<SortId>('vendas');
  const [query, setQuery] = useState('');
  const [sortOpen, setSortOpen] = useState(false);

  const visible = useMemo(() => {
    let list = products;

    if (category !== 'todos') list = list.filter((p) => p.category === category);
    if (marketplace !== 'todos') list = list.filter((p) => p.marketplace === marketplace);

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));

    const sorted = [...list];
    switch (sort) {
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
      default:
        sorted.sort((a, b) => b.salesCount - a.salesCount);
    }
    return sorted;
  }, [products, category, marketplace, sort, query]);

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
              title={mp.available ? undefined : 'Integração ainda não disponível'}
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
                  em breve
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
            placeholder="Buscar produto..."
            className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-20 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text)]">
            Nenhum produto encontrado
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
            Ajuste os filtros ou tente outro termo de busca.
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
