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
  return NextResponse.json({
    rows: rows.map((r) => ({ marketplace: r.marketplace, region: r.region, active: r.active, count: r._count._all })),
    visibleTotal: withImage,
  });
}
