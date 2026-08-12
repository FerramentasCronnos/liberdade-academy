import { CatalogConfigError, type CatalogProvider, type FetchOptions, type RawCatalogProduct } from '../types.js';

/**
 * Kalodata — analytics de TikTok Shop, cobre BR e US.
 * A Open API é exclusiva do plano Enterprise: assinar o dashboard não libera
 * a chave. Sem CALODATA_API_KEY este provider não roda.
 */

type KalodataProduct = {
  id: string;
  title: string;
  image_url?: string;
  product_url?: string;
  price?: number;
  currency?: string;
  category?: string;
  seller_name?: string;
  rating?: number;
  total_sales?: number;
  tiktok_views?: number;
  commission_rate?: number;
  description?: string;
  ships_directly?: boolean;
};

export const kalodataProvider: CatalogProvider = {
  name: 'kalodata',
  supportedRegions: ['BR', 'US'],

  isConfigured() {
    return Boolean(process.env.CALODATA_API_KEY);
  },

  missingConfigMessage() {
    return 'CALODATA_API_KEY não configurada. A Open API da Kalodata exige plano Enterprise.';
  },

  async fetchTopProducts({ region, limit, category }: FetchOptions): Promise<RawCatalogProduct[]> {
    const apiKey = process.env.CALODATA_API_KEY;
    if (!apiKey) throw new CatalogConfigError(this.missingConfigMessage());

    const baseUrl = process.env.CALODATA_BASE_URL || 'https://api.kalodata.com/v1';
    const url = new URL(`${baseUrl}/products/viral`);
    url.searchParams.set('platform', 'tiktok');
    url.searchParams.set('country', region);
    url.searchParams.set('per_page', String(limit));
    url.searchParams.set('sort', 'views_desc');
    if (category) url.searchParams.set('category', category);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Kalodata respondeu ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as { data?: KalodataProduct[] };

    return (payload.data || []).map((item) => ({
      externalId: item.id,
      name: item.title,
      image: item.image_url,
      productUrl: item.product_url,
      price: item.price,
      currency: item.currency,
      category: item.category,
      supplier: item.seller_name,
      rating: item.rating,
      salesCount: item.total_sales,
      tiktokViews: item.tiktok_views,
      commission: item.commission_rate,
      description: item.description,
      supplierShips: item.ships_directly,
    }));
  },
};
