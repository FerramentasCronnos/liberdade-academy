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
  { id: 'mercado_livre', label: 'Mercado Livre', color: '#ffe600', available: false },
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
  beleza: 'Beleza',
  saude: 'Saúde',
  fitness: 'Fitness',
  moda: 'Moda',
  casa: 'Casa',
  tech: 'Eletrônicos',
  digital: 'Digital',
  fisico: 'Outros',
};

export const CATEGORIES: Category[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'beleza', label: 'Beleza' },
  { id: 'saude', label: 'Saúde' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'moda', label: 'Moda' },
  { id: 'casa', label: 'Casa & Cozinha' },
  { id: 'tech', label: 'Eletrônicos' },
  { id: 'fisico', label: 'Outros' },
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
  { id: 'vendas', label: 'Mais vendidos' },
  { id: 'comissao', label: 'Maior comissão' },
  { id: 'preco_asc', label: 'Menor preço' },
  { id: 'preco_desc', label: 'Maior preço' },
  { id: 'avaliacao', label: 'Melhor avaliação' },
];
