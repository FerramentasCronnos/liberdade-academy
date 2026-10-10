import { NextResponse } from 'next/server';
import { backfillCreatorAvatars } from '@/lib/domain/creators/avatars';

/** Busca fotos de perfil dos criadores que ainda não têm. `?limit=60`. CRON_SECRET. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const limit = Number(new URL(request.url).searchParams.get('limit')) || 60;
  return NextResponse.json(await backfillCreatorAvatars(limit, Date.now() + 270_000));
}
