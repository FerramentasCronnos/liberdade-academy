import type { Product, ProductRegion } from '../types';

/**
 * Mercado do catálogo. Hoje só Brasil.
 *
 * O backend continua capaz de sincronizar US (o adapter e o banco são
 * multi-região); para ligar, basta CATALOG_REGIONS=BR,US na stack e trocar
 * esta constante — ou definir EXPO_PUBLIC_CATALOG_REGION.
 */
export const CATALOG_REGION: ProductRegion =
  (process.env.EXPO_PUBLIC_CATALOG_REGION as ProductRegion) || 'BR';

export type SortOption = 'vendas' | 'preco_asc' | 'preco_desc' | 'avaliacao';

export const SORT_OPTIONS: Array<{ id: SortOption; label: string; icon: string }> = [
  { id: 'vendas', label: 'Mais vendidos', icon: 'trending-up' },
  { id: 'preco_asc', label: 'Menor preço', icon: 'arrow-down' },
  { id: 'preco_desc', label: 'Maior preço', icon: 'arrow-up' },
  { id: 'avaliacao', label: 'Melhor avaliação', icon: 'star' },
];

export interface CatalogFilters {
  sort: SortOption;
  onlyViral: boolean;
  onlyDirectShipping: boolean;
  minPrice: string;
  maxPrice: string;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  sort: 'vendas',
  onlyViral: false,
  onlyDirectShipping: false,
  minPrice: '',
  maxPrice: '',
};

/**
 * Aplica filtros e ordenação. Fica aqui (e não na tela) porque o painel
 * precisa da mesma conta pra mostrar quantos produtos o rascunho devolveria
 * antes de aplicar.
 */
export function applyCatalogFilters(products: Product[], filters: CatalogFilters): Product[] {
  let list = products;

  if (filters.onlyViral) list = list.filter((p) => p.isViral);
  if (filters.onlyDirectShipping) list = list.filter((p) => p.supplierShips);

  const min = Number(filters.minPrice);
  if (filters.minPrice.trim() && Number.isFinite(min)) {
    list = list.filter((p) => p.price >= min);
  }

  const max = Number(filters.maxPrice);
  if (filters.maxPrice.trim() && Number.isFinite(max)) {
    list = list.filter((p) => p.price <= max);
  }

  // cópia antes de ordenar — sort muta o array recebido
  const sorted = [...list];
  switch (filters.sort) {
    case 'preco_asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'preco_desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'avaliacao':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    default:
      sorted.sort((a, b) => b.salesCount - a.salesCount);
  }
  return sorted;
}

/** Quantos filtros estão ativos — usado no badge do botão. */
export function countActiveFilters(filters: CatalogFilters): number {
  let count = 0;
  if (filters.sort !== DEFAULT_FILTERS.sort) count += 1;
  if (filters.onlyViral) count += 1;
  if (filters.onlyDirectShipping) count += 1;
  if (filters.minPrice.trim()) count += 1;
  if (filters.maxPrice.trim()) count += 1;
  return count;
}
