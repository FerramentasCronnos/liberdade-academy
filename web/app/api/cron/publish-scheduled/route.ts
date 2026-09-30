import { NextResponse } from 'next/server';
import { publishDueAnnouncements } from '@/lib/community-data';

/** Envia o e-mail dos anúncios agendados cuja hora chegou. Cron + chamada manual. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const results = await publishDueAnnouncements();
  return NextResponse.json({ ok: true, results });
}
