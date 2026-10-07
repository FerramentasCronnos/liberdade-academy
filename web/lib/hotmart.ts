/**
 * Cliente mínimo da API da Hotmart (Developers API).
 *
 * Token via client credentials, guardado em memória até expirar. O histórico
 * de vendas é paginado por page_token; percorremos tudo dentro da janela.
 */
const AUTH_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token';
const SALES_URL = 'https://developers.hotmart.com/payments/api/v1/sales/history';

/**
 * Mais de uma conta Hotmart: HOTMART_CLIENT_ID/SECRET é a primeira e
 * HOTMART_CLIENT_ID_2/SECRET_2 (e _3…) as seguintes. A sincronização
 * percorre todas; vendas antigas ficam na conta antiga.
 */
interface Account {
  id: string;
  secret: string;
}

function accounts(): Account[] {
  const list: Account[] = [];
  for (const suffix of ['', '_2', '_3', '_4']) {
    const id = process.env[`HOTMART_CLIENT_ID${suffix}`];
    const secret = process.env[`HOTMART_CLIENT_SECRET${suffix}`];
    if (id && secret) list.push({ id, secret });
  }
  if (!list.length) throw new Error('HOTMART_CLIENT_ID/HOTMART_CLIENT_SECRET não configurados.');
  return list;
}

const cached = new Map<string, { token: string; expiresAt: number }>();

async function token(account: Account) {
  const hit = cached.get(account.id);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const basic = Buffer.from(`${account.id}:${account.secret}`).toString('base64');
  const url = `${AUTH_URL}?grant_type=client_credentials&client_id=${account.id}&client_secret=${account.secret}`;
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${basic}` } });
  if (!response.ok) throw new Error(`Hotmart auth ${response.status}`);

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached.set(account.id, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

/** Hottoks aceitos no webhook: um por conta, separados por vírgula. */
export function hottoks(): string[] {
  return (process.env.HOTMART_HOTTOK || '').split(',').map((t) => t.trim()).filter(Boolean);
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

/** Vendas com um status desde `since` (epoch ms), em todas as contas. */
export async function listSales(status: HotmartStatus, since: number): Promise<HotmartSale[]> {
  const out: HotmartSale[] = [];
  for (const account of accounts()) {
    out.push(...(await listSalesFor(account, status, since)));
  }
  return out;
}

async function listSalesFor(account: Account, status: HotmartStatus, since: number): Promise<HotmartSale[]> {
  const bearer = await token(account);
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
