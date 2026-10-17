import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/db';

/**
 * Cadastro das Bank Offers (produtos e fornecedores próprios da MVA) no
 * catálogo. Protegido pelo CRON_SECRET.
 *
 * POST { offers: [{ slug, name, url, image, category?, description?, price?, commission?, supplier? }] }
 *   - `image` é uma URL pública: a foto é copiada pro Blob (a página do
 *     fornecedor pode mudar ou sair do ar).
 *   - upsert por slug (provider 'bank_offers', região US).
 * GET lista as ofertas cadastradas. DELETE { slug } remove.
 */
const PROVIDER = 'bank_offers';

type OfferInput = {
  slug: string;
  name: string;
  url: string;
  image?: string;
  category?: string;
  description?: string;
  price?: number;
  commission?: number | null;
  supplier?: string;
  active?: boolean;
};

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

async function persistImage(url: string, slug: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`imagem ${response.status}`);
  const type = response.headers.get('content-type') || 'image/png';
  const ext = type.includes('jpeg') || type.includes('jpg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png';
  const blob = await put(`catalog/bank-offers/${slug}.${ext}`, await response.blob(), {
    access: 'public',
    contentType: type,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { offers?: OfferInput[] };
  const results: Array<Record<string, unknown>> = [];

  for (const offer of body.offers ?? []) {
    const slug = String(offer.slug || '').trim().toLowerCase();
    if (!slug || !offer.name || !offer.url) {
      results.push({ slug, error: 'slug, name e url são obrigatórios' });
      continue;
    }
    try {
      const where = { provider_region_externalId: { provider: PROVIDER, region: 'US', externalId: slug } };
      const existing = await prisma.product.findUnique({ where, select: { image: true } });
      const image = offer.image ? await persistImage(offer.image, slug) : existing?.image;
      if (!image) {
        results.push({ slug, error: 'sem imagem' });
        continue;
      }
      const data = {
        name: offer.name.slice(0, 300),
        image,
        images: [image],
        productUrl: offer.url,
        price: Math.max(0, Number(offer.price ?? 0)),
        category: offer.category || 'saude',
        supplier: offer.supplier || 'Bank Offers · MVA',
        rating: 0,
        salesCount: 0,
        isViral: false,
        commission: offer.commission == null ? null : Math.round(Number(offer.commission)),
        description: (offer.description || offer.name).slice(0, 2000),
        supplierShips: true,
        active: offer.active ?? true,
        marketplace: PROVIDER,
        currency: 'USD',
        syncedAt: new Date(),
      };
      const product = await prisma.product.upsert({
        where,
        update: data,
        create: { ...data, provider: PROVIDER, region: 'US', externalId: slug },
        select: { id: true },
      });
      results.push({ slug, id: product.id, image });
    } catch (error) {
      results.push({ slug, error: error instanceof Error ? error.message : 'erro' });
    }
  }
  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  const offers = await prisma.product.findMany({
    where: { provider: PROVIDER },
    orderBy: { createdAt: 'asc' },
    select: { id: true, externalId: true, name: true, price: true, commission: true, active: true, image: true, productUrl: true },
  });
  return NextResponse.json({ offers });
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  const { slug } = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ message: 'slug' }, { status: 400 });
  const removed = await prisma.product.deleteMany({ where: { provider: PROVIDER, externalId: slug } });
  return NextResponse.json({ removed: removed.count });
}
