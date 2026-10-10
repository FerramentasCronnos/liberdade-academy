/**
 * Contrato dos provedores de catálogo (TikTok Shop).
 *
 * Trocar de fornecedor = mudar CATALOG_PROVIDER, sem tocar em rota ou banco.
 * Cada provider traduz a resposta da sua API para RawCatalogProduct; o
 * normalizador em ./normalize.ts cuida do resto (categoria, viral, comissão).
 */

export type Region = 'BR' | 'US';

export const REGIONS: Region[] = ['BR', 'US'];

export const CURRENCY_BY_REGION: Record<Region, string> = {
  BR: 'BRL',
  US: 'USD',
};

export function isRegion(value: string): value is Region {
  return (REGIONS as string[]).includes(value);
}

/** Produto como o provider entrega — campos opcionais porque cada API varia. */
export interface RawCatalogProduct {
  externalId: string;
  name: string;
  image?: string;
  productUrl?: string;
  price?: number;
  currency?: string;
  /** Categoria crua do provider (ex.: "Beauty & Personal Care"). */
  category?: string;
  supplier?: string;
  rating?: number;
  salesCount?: number;
  tiktokViews?: number;
  /** Percentual de comissão (0–100). */
  commission?: number;
  description?: string;
  supplierShips?: boolean;
}

export interface FetchOptions {
  region: Region;
  /** Máximo de produtos a buscar nesta chamada. */
  limit: number;
  /** Categoria interna (beleza, saude, ...) quando o provider suportar filtro. */
  category?: string;
  /**
   * Termos de busca explícitos.
   *
   * O actor devolve no máximo 5 itens por execução na conta grátis, então
   * buscar termo a termo é a única forma de montar catálogo grande: cada
   * execução traz um conjunto diferente.
   */
  terms?: string[];
  /**
   * externalIds que já existem no banco com imagem. O provider pode pular as
   * chamadas caras (detalhe do produto) para eles e devolver só os campos que
   * mudam todo dia (vendas, comissão); o sync completa o resto do que já tem.
   */
  knownIds?: Set<string>;
  /** Instante (ms) a partir do qual o provider deve parar de buscar e devolver o que tem. */
  deadline?: number;
}

/** Vídeo de criador que vendeu o produto — referência de conteúdo pro afiliado. */
export interface RawReferenceVideo {
  videoId: string;
  title?: string;
  url: string;
  creatorHandle: string;
  creatorId?: string;
  thumbnail?: string;
  views?: number;
  /** Receita estimada gerada pelo vídeo, na moeda do produto. */
  revenue?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  isAd?: boolean;
  publishedAt?: Date;
}

export type Marketplace = 'tiktok_shop' | 'amazon' | 'shopee' | 'mercado_livre';

export interface CatalogProvider {
  /** Valor aceito em CATALOG_PROVIDER. */
  readonly name: string;

  /** Loja que este provider alimenta. */
  readonly marketplace: Marketplace;

  /** Regiões que este provider consegue atender. */
  readonly supportedRegions: Region[];

  /** true quando as variáveis de ambiente necessárias estão presentes. */
  isConfigured(): boolean;

  /** Mensagem explicando o que falta configurar (usada no erro da rota). */
  missingConfigMessage(): string;

  fetchTopProducts(options: FetchOptions): Promise<RawCatalogProduct[]>;

  /**
   * Vídeos de referência (3–5) de um produto, do mais vendedor pro menos.
   * Opcional: só providers com dados de criadores (Kalodata) implementam.
   */
  fetchReferenceVideos?(externalId: string, region: Region): Promise<RawReferenceVideo[]>;
}

/** Erro de configuração — a rota traduz em HTTP 422 em vez de 502. */
export class CatalogConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogConfigError';
  }
}
