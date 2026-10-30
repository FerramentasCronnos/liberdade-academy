import { dropUpsellPurchaseByEmail, grantAccess, recordPurchaseByEmail, revokeAccess } from '@/lib/access';
import { deliverMvaAccess } from '@/lib/brain-access';
import { listSales } from '@/lib/hotmart';

/**
 * Sincroniza compras da Hotmart com os acessos e com o nível das Bank Offers.
 *
 * Compra aprovada vira conta (com e-mail); a segunda compra do mesmo e-mail
 * (upsell Franquia/Golden) só registra o produto, que define o nível.
 * Reembolso do produto principal bloqueia o login; do upsell, tira só o nível.
 * Usado pelo cron diário (45 dias) e pelo botão do admin (12 meses).
 */
export const SYNC_WINDOW_DAYS = 45;

export interface HotmartSyncReport {
  created: string[];
  existing: number;
  purchasesRecorded: number;
  revoked: string[];
  emailErrors: string[];
}

export async function syncHotmart(days = SYNC_WINDOW_DAYS): Promise<HotmartSyncReport> {
  const since = Date.now() - Math.min(Math.max(days, 1), 730) * 86_400_000;
  const report: HotmartSyncReport = { created: [], existing: 0, purchasesRecorded: 0, revoked: [], emailErrors: [] };

  const approved = [...(await listSales('APPROVED', since)), ...(await listSales('COMPLETE', since))];
  const seen = new Set<string>();
  for (const sale of approved) {
    if (seen.has(sale.buyerEmail)) {
      await recordPurchaseByEmail(sale.buyerEmail, sale.productName);
      report.purchasesRecorded += 1;
      continue;
    }
    seen.add(sale.buyerEmail);

    const result = await grantAccess({ name: sale.buyerName, email: sale.buyerEmail, source: 'hotmart', product: sale.productName });
    if (!result.created) {
      report.existing += 1;
      continue;
    }
    report.created.push(sale.buyerEmail);
    const mail = await deliverMvaAccess({ ...result, source: 'hotmart' });
    if (!mail.ok) report.emailErrors.push(`${sale.buyerEmail}: ${mail.error}`);
  }

  const lost = [
    ...(await listSales('REFUNDED', since)),
    ...(await listSales('CHARGEBACK', since)),
    ...(await listSales('CANCELLED', since)),
  ];
  for (const sale of lost) {
    // quem comprou de novo depois do reembolso continua com acesso
    if (seen.has(sale.buyerEmail)) continue;
    if (await dropUpsellPurchaseByEmail(sale.buyerEmail, sale.productName)) continue;
    const result = await revokeAccess(sale.buyerEmail, 'hotmart');
    if (result.revoked) report.revoked.push(sale.buyerEmail);
  }

  return report;
}
