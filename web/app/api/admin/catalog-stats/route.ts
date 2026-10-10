import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Contagem do catálogo por loja e região, para conferir sincronizações. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const rows = await prisma.product.groupBy({
    by: ['marketplace', 'region', 'active'],
    _count: { _all: true },
    orderBy: [{ marketplace: 'asc' }, { region: 'asc' }],
  });
  const withImage = await prisma.product.count({ where: { active: true, image: { startsWith: 'http' } } });
  // provider em teste (Kalodata): últimos produtos e quantos vídeos cada um tem
  const provider = new URL(request.url).searchParams.get('provider') || 'kalodata';
  const latest = await prisma.product.findMany({
    where: { provider },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { id: true, name: true, category: true, active: true, commission: true, _count: { select: { videos: true } } },
  });
  return NextResponse.json({
    rows: rows.map((r) => ({ marketplace: r.marketplace, region: r.region, active: r.active, count: r._count._all })),
    visibleTotal: withImage,
    provider,
    withVideos: latest.filter((p) => p._count.videos > 0).length,
    latest: latest.map((p) => ({ id: p.id, name: p.name.slice(0, 60), category: p.category, active: p.active, commission: p.commission, videos: p._count.videos })),
  });
}
