import { NextResponse } from 'next/server';
import { runSeed } from '@/lib/seed';

/**
 * Carga inicial do banco, chamada uma vez após o primeiro deploy.
 *
 * Protegida pelo CRON_SECRET: sem isso qualquer pessoa poderia disparar
 * escrita no banco de produção. É idempotente, mas ainda assim não deve ficar
 * aberta.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: 'CRON_SECRET no configurado — endpoint deshabilitado.' },
      { status: 503 },
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await runSeed()) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Falló la carga inicial.' },
      { status: 500 },
    );
  }
}
