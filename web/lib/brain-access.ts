import { sendMvaAccessEmail } from '@/lib/email';

/**
 * Acesso único do MVA: numa compra, o catálogo cria a conta dele, passa a mesma senha para a BRAIN
 * (s4.brainexperts.com.br) e manda um e-mail só, com os dois acessos. A BRAIN não manda o e-mail dela; se esta
 * ligação falhar, ela manda o próprio e-mail depois de alguns minutos.
 *
 * BRAIN_ACCESS_SECRET é a chave combinada com a BRAIN (derivada da APP_SECRET dela).
 */
export type BrainAccess = 'created' | 'password_set' | 'existing' | 'unavailable';

export const BRAIN_URL = (process.env.BRAIN_URL || 'https://s4.brainexperts.com.br').replace(/\/$/, '');

export async function syncBrainAccess(input: { email: string; name: string; password: string }): Promise<BrainAccess> {
  const secret = process.env.BRAIN_ACCESS_SECRET;
  if (!secret) return 'unavailable';
  try {
    const response = await fetch(`${BRAIN_URL}/api/internal/mva-access`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email, name: input.name, password: input.password }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`[brain] acesso de ${input.email} não sincronizado: HTTP ${response.status}`);
      return 'unavailable';
    }
    const data = (await response.json().catch(() => ({}))) as { brain?: string };
    return data.brain === 'created' || data.brain === 'password_set' || data.brain === 'existing' ? data.brain : 'unavailable';
  } catch (error) {
    console.error(`[brain] acesso de ${input.email} não sincronizado:`, (error as Error).message);
    return 'unavailable';
  }
}

/**
 * Lojas cujo comprador ainda recebe o e-mail de acesso do catálogo. Desde 03/11/2026 quem compra pela Hotmart ou pela
 * Brain Academy recebe só o e-mail de boas-vindas da área de membros (academy.s4accelerator.com): cria a senha lá e
 * abre o catálogo e a BRAIN pela Central de ferramentas, já logado. A Kiwify não manda vendas para a área de membros,
 * então quem compra por ela continua recebendo este e-mail.
 */
const MAIL_SOURCES = new Set(['kiwify']);

/** Entrega o acesso de uma compra: senha igual na BRAIN e, só para as lojas de MAIL_SOURCES, o e-mail do MVA. */
export async function deliverMvaAccess(input: {
  name: string;
  email: string;
  password: string;
  source?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const brain = await syncBrainAccess(input);
  if (!MAIL_SOURCES.has((input.source ?? '').toLowerCase())) return { ok: true };
  return sendMvaAccessEmail({ ...input, brain, source: input.source });
}
