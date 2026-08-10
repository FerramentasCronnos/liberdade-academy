import { prisma } from '../lib/prisma.js';

type KalodataProduct = {
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
};

const CATEGORY_MAP: Record<string, string> = {
  beauty: 'beleza',
  health: 'saude',
  physical: 'fisico',
  digital: 'digital',
  fashion: 'moda',
  home: 'casa',
  tech: 'tech',
  fitness: 'fitness',
};

/**
 * Sync server-side do Kalodata.
 * Sem chave, não faz nada (catálogo fica no seed/Postgres).
 */
export async function syncKalodataProducts() {
  const apiKey = process.env.CALODATA_API_KEY;
  const baseUrl = process.env.CALODATA_BASE_URL || 'https://api.kalodata.com/v1';

  if (!apiKey) {
    return {
      synced: 0,
      message: 'CALODATA_API_KEY não configurada. Usando catálogo local do Postgres.',
    };
  }

  const url = new URL(`${baseUrl}/products/viral`);
  url.searchParams.set('platform', 'tiktok');
  url.searchParams.set('per_page', '50');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Kalodata respondeu ${response.status}`);
  }

  const payload = (await response.json()) as { data?: KalodataProduct[] };
  const items = payload.data || [];

  let synced = 0;
  for (const item of items) {
    await prisma.product.upsert({
      where: { externalId: item.id },
      update: {
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
        active: true,
      },
      create: {
        externalId: item.id,
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
      },
    });
    synced += 1;
  }

  return { synced, message: `${synced} produtos sincronizados do Kalodata.` };
}
