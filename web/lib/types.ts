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
  { id: 'amazon', label: 'Amazon', color: '#ff9900', available: true },
  { id: 'shopee', label: 'Shopee', color: '#ee4d2d', available: true },
  { id: 'mercado_livre', label: 'Mercado Libre', color: '#ffe600', available: false },
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
  marketplace?: string;
  isNew?: boolean;
  createdAt?: string;
  /** Galeria; sempre tem ao menos a foto principal. */
  images?: string[];
  /** Dados de venda da fonte (Kalodata, últimos 30 días). Ausente nas outras lojas. */
  metrics?: ProductMetrics;
}

export interface ProductMetrics {
  /** Receita do período, na moeda do produto. */
  revenue: number;
  /** Crescimento da receita em % contra o período anterior. */
  revenueGrowth?: number;
  unitPrice?: number;
  videoRevenue?: number;
  liveRevenue?: number;
  reviewCount?: number;
  creatorCount?: number;
  videoCount?: number;
  /** ISO só com a data. */
  launchDate?: string;
  /** Histórico diário de receita acumulado pelo sync. */
  trend: Array<{ d: string; r: number }>;
}

export interface Product extends ApiProduct {
  marketplace: Marketplace;
  /** Valor da comissão em dinheiro; null quando a fonte não informa a taxa. */
  commissionValue: number | null;
}

export type SortId =
  | 'novedades'
  | 'vendas'
  | 'ingresos'
  | 'crecimiento'
  | 'preco_asc'
  | 'preco_desc'
  | 'avaliacao'
  | 'comissao';

export const SORTS: Array<{ id: SortId; label: string }> = [
  { id: 'novedades', label: 'Novedades primero' },
  { id: 'vendas', label: 'Más vendidos' },
  { id: 'ingresos', label: 'Mayores ingresos (30 días)' },
  { id: 'crecimiento', label: 'Mayor crecimiento' },
  { id: 'comissao', label: 'Mayor comisión' },
  { id: 'preco_asc', label: 'Menor precio' },
  { id: 'preco_desc', label: 'Mayor precio' },
  { id: 'avaliacao', label: 'Mejor valoración' },
];

/**
 * Filtros numéricos do catálogo (dados da Kalodata). Cada opção é um limite
 * mínimo/máximo; "todos" não filtra. Produto sem a métrica só passa em "todos".
 */
export interface RangeOption {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const REVENUE_FILTERS: RangeOption[] = [
  { id: 'todos', label: 'Ingresos: todos' },
  { id: '10k', label: 'Ingresos ≥ $10K', min: 10_000 },
  { id: '50k', label: 'Ingresos ≥ $50K', min: 50_000 },
  { id: '100k', label: 'Ingresos ≥ $100K', min: 100_000 },
  { id: '500k', label: 'Ingresos ≥ $500K', min: 500_000 },
];

export const GROWTH_FILTERS: RangeOption[] = [
  { id: 'todos', label: 'Crecimiento: todos' },
  { id: 'up', label: 'En crecimiento (> 0%)', min: 0.000001 },
  { id: '25', label: 'Crecimiento ≥ 25%', min: 25 },
  { id: '50', label: 'Crecimiento ≥ 50%', min: 50 },
  { id: '100', label: 'Crecimiento ≥ 100%', min: 100 },
];

export const SOLD_FILTERS: RangeOption[] = [
  { id: 'todos', label: 'Vendidos: todos' },
  { id: '1k', label: 'Vendidos ≥ 1K', min: 1_000 },
  { id: '5k', label: 'Vendidos ≥ 5K', min: 5_000 },
  { id: '10k', label: 'Vendidos ≥ 10K', min: 10_000 },
  { id: '50k', label: 'Vendidos ≥ 50K', min: 50_000 },
];

export const COMMISSION_FILTERS: RangeOption[] = [
  { id: 'todos', label: 'Comisión: todas' },
  { id: '5', label: 'Comisión ≥ 5%', min: 5 },
  { id: '10', label: 'Comisión ≥ 10%', min: 10 },
  { id: '15', label: 'Comisión ≥ 15%', min: 15 },
  { id: '20', label: 'Comisión ≥ 20%', min: 20 },
];

export const PRICE_FILTERS: RangeOption[] = [
  { id: 'todos', label: 'Precio: todos' },
  { id: 'lt20', label: 'Precio < $20', max: 20 },
  { id: '20-50', label: 'Precio $20–50', min: 20, max: 50 },
  { id: '50-100', label: 'Precio $50–100', min: 50, max: 100 },
  { id: 'gt100', label: 'Precio > $100', min: 100 },
];
