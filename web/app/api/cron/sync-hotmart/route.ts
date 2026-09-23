import { NextResponse } from 'next/server';
import { grantAccess, revokeAccess } from '@/lib/access';
import { sendAccessEmail } from '@/lib/email';
import { listSales } from '@/lib/hotmart';

/**
 * Sincroniza compras da Hotmart com os acessos.
 *
 * A Hotmart oferece webhook, mas ele depende de configurar o hottok no
 * painel. Consultar a API a cada meia hora funciona só com as credenciais
 * e cobre também o que o webhook tiver perdido. Compra aprovada vira conta
 * (com e-mail); reembolso, chargeback e cancelamento bloqueiam o login.
 *
 * O Vercel envia o header Authorization com CRON_SECRET.
 */
export const maxDuration = 120;

const WINDOW_DAYS = 45;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const since = Date.now() - WINDOW_DAYS * 86_400_000;
  const report = { created: [] as string[], existing: 0, revoked: [] as string[], emailErrors: [] as string[] };

  try {
    const approved = [...(await listSales('APPROVED', since)), ...(await listSales('COMPLETE', since))];
    const seen = new Set<string>();
    for (const sale of approved) {
      if (seen.has(sale.buyerEmail)) continue;
      seen.add(sale.buyerEmail);

      const result = await grantAccess({ name: sale.buyerName, email: sale.buyerEmail, source: 'hotmart' });
      if (!result.created) {
        report.existing += 1;
        continue;
      }
      report.created.push(sale.buyerEmail);
      const mail = await sendAccessEmail(result);
      if (!mail.ok) report.emailErrors.push(`${sale.buyerEmail}: ${mail.error}`);
    }

    const lost = [
      ...(await listSales('REFUNDED', since)),
      ...(await listSales('CHARGEBACK', since)),
      ...(await listSales('CANCELED', since)),
    ];
    for (const sale of lost) {
      // quem comprou de novo depois do reembolso continua com acesso
      if (seen.has(sale.buyerEmail)) continue;
      const result = await revokeAccess(sale.buyerEmail, 'hotmart');
      if (result.revoked) report.revoked.push(sale.buyerEmail);
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'erro', ...report },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, ...report });
}
