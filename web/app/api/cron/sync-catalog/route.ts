import { NextResponse } from 'next/server';
import { syncCatalog } from '@/lib/domain/catalog';

/**
 * Sincroniza o catálogo. Chamado pelo Vercel Cron (ver vercel.json).
 *
 * O Vercel envia o header Authorization com CRON_SECRET; sem conferir isso a
 * rota ficaria aberta e qualquer um poderia disparar consumo na Apify.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const result = await syncCatalog();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Falló la sincronización.' },
      { status: 500 },
    );
  }
}
