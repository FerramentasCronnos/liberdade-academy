export type Marketplace = 'tiktok_shop' | 'shopee' | 'mercado_livre' | 'amazon';

export interface MarketplaceInfo {
  id: Marketplace;
  label: string;
  /** Cor da marca, usada no selo do card. */
  color: string;
  /** false = ainda não integrado; a UI mostra como "em breve". */
  available: boolean;
}

export const MARKETPLACES: MarketplaceInfo[] = [
  { id: 'tiktok_shop', label: 'TikTok Shop', color: '#111827', available: true },
  { id: 'shopee', label: 'Shopee', color: '#ee4d2d', available: false },
  { id: 'mercado_livre', label: 'Mercado Libre', color: '#ffe600', available: false },
  { id: 'amazon', label: 'Amazon', color: '#ff9900', available: false },
];

export const MARKETPLACE_BY_ID = Object.fromEntries(
  MARKETPLACES.map((m) => [m.id, m]),
) as Record<Marketplace, MarketplaceInfo>;

export type CategoryId =
  | 'todos'
  | 'beleza'
  | 'saude'
  | 'fisico'
  | 'digital'
  | 'moda'
  | 'casa'
  | 'tech'
  | 'fitness';

export interface Category {
  id: CategoryId;
  label: string;
}

/** Rótulo curto usado no chip do card. */
export const CATEGORY_LABEL: Record<string, string> = {
  beleza: 'Belleza',
  saude: 'Salud',
  fitness: 'Fitness',
  moda: 'Moda',
  casa: 'Casa',
  tech: 'Electrónicos',
  digital: 'Digital',
  fisico: 'Otros',
};

export const CATEGORIES: Category[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'beleza', label: 'Belleza' },
  { id: 'saude', label: 'Salud' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'moda', label: 'Moda' },
  { id: 'casa', label: 'Casa y Cocina' },
  { id: 'tech', label: 'Electrónicos' },
  { id: 'fisico', label: 'Otros' },
  { id: 'digital', label: 'Digital' },
];

/** Produto como a API Fastify devolve hoje. */
export interface ApiProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  supplier: string;
  rating: number;
  salesCount: number;
  tiktokViews?: number;
  isViral: boolean;
  /** Taxa vinda da fonte. Ausente = a fonte não informou. */
  commission?: number;
  /** Taxa configurada por categoria no backend. Exibir como estimativa. */
  commissionEstimated?: number;
  description: string;
  supplierShips: boolean;
  region?: string;
  currency?: string;
  productUrl?: string;
}

export interface Product extends ApiProduct {
  marketplace: Marketplace;
  /** Valor da comissão em dinheiro; null quando a fonte não informa a taxa. */
  commissionValue: number | null;
}

export type SortId = 'vendas' | 'preco_asc' | 'preco_desc' | 'avaliacao' | 'comissao';

export const SORTS: Array<{ id: SortId; label: string }> = [
  { id: 'vendas', label: 'Más vendidos' },
  { id: 'comissao', label: 'Mayor comisión' },
  { id: 'preco_asc', label: 'Menor precio' },
  { id: 'preco_desc', label: 'Mayor precio' },
  { id: 'avaliacao', label: 'Mejor valoración' },
];
