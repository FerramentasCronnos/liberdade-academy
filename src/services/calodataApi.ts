import type { Product, ProductCategory } from '../types';
import { MOCK_PRODUCTS } from './mockData';

/**
 * Integração Kalodata (TikTok Shop analytics).
 * A API Open da Kalodata é enterprise — configure EXPO_PUBLIC_CALODATA_API_KEY
 * quando tiver a chave. Sem chave, o app usa o catálogo demo local.
 */
const CALODATA_BASE_URL =
  process.env.EXPO_PUBLIC_CALODATA_BASE_URL || 'https://api.kalodata.com/v1';

interface CalodataProduct {
  id: string;
  title: string;
  image_url: string;
  price: number;
  category: string;
  seller_name: string;
  rating: number;
  total_sales: number;
  tiktok_views: number;
  commission_rate: number;
  description: string;
  ships_directly: boolean;
}

interface CalodataResponse {
  data: CalodataProduct[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

const CATEGORY_MAP: Record<string, ProductCategory> = {
  beauty: 'beleza',
  health: 'saude',
  physical: 'fisico',
  digital: 'digital',
  fashion: 'moda',
  home: 'casa',
  tech: 'tech',
  fitness: 'fitness',
  beleza: 'beleza',
  saude: 'saude',
  fisico: 'fisico',
};

function mapCalodataProduct(item: CalodataProduct): Product {
  return {
    id: item.id,
    name: item.title,
    image: item.image_url,
    price: item.price,
    category: CATEGORY_MAP[item.category] || 'fisico',
    supplier: item.seller_name,
    rating: item.rating,
    salesCount: item.total_sales,
    tiktokViews: item.tiktok_views,
    isViral: item.tiktok_views > 1_000_000,
    commission: item.commission_rate,
    description: item.description,
    supplierShips: item.ships_directly,
  };
}

export class CalodataService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${CALODATA_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Kalodata API error: ${response.status}`);
    }

    return response.json();
  }

  async getViralProducts(page = 1, perPage = 20) {
    const data = await this.request<CalodataResponse>('/products/viral', {
      page: String(page),
      per_page: String(perPage),
      platform: 'tiktok',
      sort: 'views_desc',
    });

    return {
      products: data.data.map(mapCalodataProduct),
      hasMore: data.has_more,
    };
  }

  async searchProducts(query: string, category?: string, page = 1) {
    const params: Record<string, string> = {
      q: query,
      page: String(page),
      per_page: '20',
      platform: 'tiktok',
    };

    if (category && category !== 'todos') {
      params.category = category;
    }

    const data = await this.request<CalodataResponse>('/products/search', params);

    return {
      products: data.data.map(mapCalodataProduct),
      hasMore: data.has_more,
    };
  }
}

export const calodataService = new CalodataService(
  process.env.EXPO_PUBLIC_CALODATA_API_KEY || '',
);

export async function fetchCatalogProducts(options?: {
  category?: string;
  query?: string;
}): Promise<{ products: Product[]; fromApi: boolean }> {
  if (!calodataService.isConfigured) {
    return { products: MOCK_PRODUCTS, fromApi: false };
  }

  try {
    if (options?.query?.trim()) {
      const result = await calodataService.searchProducts(
        options.query.trim(),
        options.category,
      );
      if (result.products.length) {
        return { products: result.products, fromApi: true };
      }
    } else {
      const result = await calodataService.getViralProducts();
      if (result.products.length) {
        return { products: result.products, fromApi: true };
      }
    }
  } catch {
    // fallback silencioso para demo
  }

  return { products: MOCK_PRODUCTS, fromApi: false };
}
