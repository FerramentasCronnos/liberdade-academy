import { NextResponse } from 'next/server';
import { backfillVideoThumbnails } from '@/lib/domain/catalog/video-thumbs';

/** Preenche capas de vídeo que faltam. `?limit=100`. Protegido pelo CRON_SECRET. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const limit = Number(new URL(request.url).searchParams.get('limit')) || 60;
  const result = await backfillVideoThumbnails(limit, Date.now() + 270_000);
  return NextResponse.json(result);
}
