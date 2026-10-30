import { NextResponse } from 'next/server';
import { SYNC_WINDOW_DAYS, syncHotmart } from '@/lib/hotmart-sync';

/**
 * Sincroniza compras da Hotmart com os acessos (ver lib/hotmart-sync.ts).
 *
 * A Hotmart oferece webhook, mas ele depende de configurar o hottok no
 * painel. Consultar a API funciona só com as credenciais e cobre também o
 * que o webhook tiver perdido. No plano Hobby o cron é diário.
 *
 * O Vercel envia o header Authorization com CRON_SECRET.
 * ?days=365 refaz o histórico (ex.: registrar upsells antigos para o nível das Bank Offers).
 */
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const days = Number(new URL(request.url).searchParams.get('days')) || SYNC_WINDOW_DAYS;
  try {
    return NextResponse.json({ ok: true, ...(await syncHotmart(days)) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'erro' },
      { status: 502 },
    );
  }
}
