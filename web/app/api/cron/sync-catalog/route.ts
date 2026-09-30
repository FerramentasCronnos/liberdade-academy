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
 * Sem parâmetros, usa os termos padrão de cada categoria (o que o cron faz).
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

  try {
    const result = await syncCatalog(options);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Falló la sincronización.' },
      { status: 500 },
    );
  }
}
