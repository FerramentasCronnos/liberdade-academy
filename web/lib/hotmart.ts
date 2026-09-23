/**
 * Cliente mínimo da API da Hotmart (Developers API).
 *
 * Token via client credentials, guardado em memória até expirar. O histórico
 * de vendas é paginado por page_token; percorremos tudo dentro da janela.
 */
const AUTH_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token';
const SALES_URL = 'https://developers.hotmart.com/payments/api/v1/sales/history';

let cached: { token: string; expiresAt: number } | null = null;

async function token() {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const id = process.env.HOTMART_CLIENT_ID;
  const secret = process.env.HOTMART_CLIENT_SECRET;
  if (!id || !secret) throw new Error('HOTMART_CLIENT_ID/HOTMART_CLIENT_SECRET não configurados.');

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const url = `${AUTH_URL}?grant_type=client_credentials&client_id=${id}&client_secret=${secret}`;
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${basic}` } });
  if (!response.ok) throw new Error(`Hotmart auth ${response.status}`);

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

export type HotmartStatus = 'APPROVED' | 'COMPLETE' | 'REFUNDED' | 'CHARGEBACK' | 'CANCELLED';

export interface HotmartSale {
  transaction: string;
  status: string;
  productName: string;
  buyerName: string;
  buyerEmail: string;
  /** Epoch em ms. */
  date: number;
}

interface RawSale {
  buyer?: { name?: string; email?: string };
  product?: { name?: string };
  purchase?: { transaction?: string; status?: string; approved_date?: number; order_date?: number };
}

/** Vendas com um status desde `since` (epoch ms). */
export async function listSales(status: HotmartStatus, since: number): Promise<HotmartSale[]> {
  const bearer = await token();
  const out: HotmartSale[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      transaction_status: status,
      start_date: String(since),
      max_results: '100',
      ...(pageToken ? { page_token: pageToken } : {}),
    });
    const response = await fetch(`${SALES_URL}?${params}`, { headers: { Authorization: `Bearer ${bearer}` } });
    if (!response.ok) throw new Error(`Hotmart sales ${response.status}`);

    const data = (await response.json()) as { items?: RawSale[]; page_info?: { next_page_token?: string } };
    for (const s of data.items ?? []) {
      const email = s.buyer?.email?.trim().toLowerCase();
      if (!email) continue;
      out.push({
        transaction: s.purchase?.transaction ?? '',
        status: s.purchase?.status ?? status,
        productName: s.product?.name ?? '',
        buyerName: s.buyer?.name ?? '',
        buyerEmail: email,
        date: s.purchase?.approved_date ?? s.purchase?.order_date ?? 0,
      });
    }
    pageToken = data.page_info?.next_page_token || undefined;
  } while (pageToken);

  return out;
}
