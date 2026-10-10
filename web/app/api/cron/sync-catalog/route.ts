import { NextResponse } from 'next/server';
import { isRegion, syncCatalog, type SyncOptions } from '@/lib/domain/catalog';

/**
 * Sincroniza o catálogo. Chamado pelo Vercel Cron (ver vercel.json).
 *
 * O Vercel envia o header Authorization com CRON_SECRET; sem conferir isso a
 * rota ficaria aberta e qualquer um poderia disparar consumo na Apify.
 *
 * Chamada manual aceita parâmetros para renovar o catálogo com termos novos:
 *   ?terms=led+face+mask,heatless+curler&category=beleza&region=US&limit=40
 *   &marketplace=amazon|shopee (sem isso: TikTok Shop)
 *   &draft=1 grava produtos novos inativos (teste de provider num preview)
 *   &new=5 aceita no máximo 5 produtos novos nesta execução (gasto na Kalodata)
 * Sem parâmetros, roda as três lojas com os termos padrão (o que o cron faz).
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const options: SyncOptions = {};
  const terms = (params.get('terms') || '').split(',').map((t) => t.trim()).filter(Boolean);
  if (terms.length) options.terms = terms;
  const category = params.get('category');
  if (category) options.category = category;
  const region = params.get('region')?.toUpperCase();
  if (region && isRegion(region)) options.regions = [region];
  const limit = Number(params.get('limit'));
  if (limit > 0) options.limit = limit;
  const marketplace = params.get('marketplace');
  if (marketplace) options.marketplace = marketplace;
  if (params.get('draft') === '1') options.draft = true;
  const maxNew = Number(params.get('new'));
  if (maxNew > 0) options.maxNew = maxNew;

  try {
    if ([...params.keys()].length === 0) {
      // cron: TikTok todo dia; Amazon (US) e Shopee (BR) só às segundas,
      // porque cada execução traz ~100 produtos e custa na Apify
      const monday = new Date().getUTCDay() === 1;
      const skipped = { skipped: 'solo los lunes' };
      const all = await Promise.all([
        syncCatalog({}),
        monday ? syncCatalog({ marketplace: 'amazon', regions: ['US'] }).catch((e: Error) => ({ error: e.message })) : skipped,
        monday ? syncCatalog({ marketplace: 'shopee', regions: ['BR'] }).catch((e: Error) => ({ error: e.message })) : skipped,
      ]);
      return NextResponse.json({ tiktok_shop: all[0], amazon: all[1], shopee: all[2] });
    }
    const result = await syncCatalog(options);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Falló la sincronización.' },
      { status: 500 },
    );
  }
}
