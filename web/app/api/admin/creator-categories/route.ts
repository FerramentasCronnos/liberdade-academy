import { NextResponse } from 'next/server';
import { recomputeCreatorCategories } from '@/lib/domain/creators/category';

/** Recalcula a categoria predominante dos criadores. CRON_SECRET. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  return NextResponse.json(await recomputeCreatorCategories());
}
