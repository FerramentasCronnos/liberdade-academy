import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Enxuga o catálogo de uma fonte. Protegido pelo CRON_SECRET.
 *
 * Body JSON:
 *   { "provider": "kalodata", "keep": 50 }            mantém os N de maior receita e apaga o resto da fonte
 *   { "deactivateProvider": "apify", "marketplace": "tiktok_shop" }   desativa (não apaga) os produtos da fonte
 *   { ..., "dryRun": true }                             só conta, não altera
 *
 * Apagar (em vez de desativar) os excedentes da Kalodata é proposital: o sync
 * diário trata produto desconhecido como oferta nova, então os apagados podem
 * voltar aos poucos dentro da cota do dia. Os da Apify só são desativados,
 * para preservar histórico de quem os promoveu.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string;
    keep?: number;
    deactivateProvider?: string;
    marketplace?: string;
    dryRun?: boolean;
  };
  const result: Record<string, unknown> = { dryRun: Boolean(body.dryRun) };

  if (body.provider && body.keep && body.keep > 0) {
    const ranked = await prisma.product.findMany({
      where: { provider: body.provider },
      orderBy: [{ revenue: 'desc' }, { salesCount: 'desc' }],
      select: { id: true, name: true, revenue: true },
    });
    const extra = ranked.slice(body.keep);
    result.provider = body.provider;
    result.total = ranked.length;
    result.kept = Math.min(body.keep, ranked.length);
    result.removed = extra.map((p) => ({ id: p.id, name: p.name.slice(0, 50), revenue: p.revenue }));
    if (!body.dryRun && extra.length) {
      await prisma.product.deleteMany({ where: { id: { in: extra.map((p) => p.id) } } });
    }
  }

  if (body.deactivateProvider) {
    const where = {
      provider: body.deactivateProvider,
      active: true,
      ...(body.marketplace ? { marketplace: body.marketplace } : {}),
    };
    const count = await prisma.product.count({ where });
    result.deactivateProvider = body.deactivateProvider;
    result.deactivated = count;
    if (!body.dryRun && count) await prisma.product.updateMany({ where, data: { active: false } });
  }

  return NextResponse.json(result);
}
