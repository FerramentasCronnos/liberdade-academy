import { NextResponse } from 'next/server';
import { isRegion } from '@/lib/domain/catalog';
import { CatalogConfigError } from '@/lib/domain/catalog/types';
import { syncCreators, type SyncCreatorsOptions } from '@/lib/domain/creators/sync';

/**
 * Ranking dos top criadores (Bank Offers). Chamado pelo Vercel Cron a cada 2
 * dias (ver vercel.json); o header Authorization com CRON_SECRET impede que
 * alguém de fora dispare gasto de créditos na Kalodata.
 *
 * Chamada manual: ?top=50&profiles=60&refreshDays=14&region=US
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  // sem CRON_SECRET configurado a rota fica fechada: cada chamada gasta crédito
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  // tetos: acima disso uma chamada só estoura o tempo da função e a cota
  const params = new URL(request.url).searchParams;
  const options: SyncCreatorsOptions = {};
  const top = Number(params.get('top'));
  if (top > 0) options.top = Math.min(Math.floor(top), 200);
  const profiles = Number(params.get('profiles'));
  if (profiles >= 0 && params.has('profiles')) options.maxProfiles = Math.min(Math.floor(profiles), 150);
  const refreshDays = Number(params.get('refreshDays'));
  if (refreshDays >= 0 && params.has('refreshDays')) options.profileRefreshDays = refreshDays;
  const region = params.get('region')?.toUpperCase();
  if (region && isRegion(region)) options.region = region;

  try {
    return NextResponse.json(await syncCreators(options));
  } catch (error) {
    const status = error instanceof CatalogConfigError ? 422 : 500;
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Falló la sincronización de creadores.',
      },
      { status },
    );
  }
}
