import { NextResponse } from 'next/server';
import { backfillCreatorVideoThumbnails, backfillVideoThumbnails } from '@/lib/domain/catalog/video-thumbs';

/**
 * Preenche capas de vídeo que faltam (vídeos de produto e de criador).
 * `?limit=100` vale para cada grupo. Protegido pelo CRON_SECRET.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const limit = Number(new URL(request.url).searchParams.get('limit')) || 60;
  const deadline = Date.now() + 270_000;
  // em sequência: o oEmbed do TikTok tem limite e as duas filas compartilham o IP
  const products = await backfillVideoThumbnails(limit, deadline);
  const creators = await backfillCreatorVideoThumbnails(limit, deadline);
  return NextResponse.json({ products, creators });
}
