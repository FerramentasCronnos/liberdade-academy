import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { grantAccess } from '@/lib/access';
import { deliverMvaAccess } from '@/lib/brain-access';
import { hottoks } from '@/lib/hotmart';

/**
 * Entrada direta pela Central de ferramentas da MVA Academy (academy.s4accelerator.com): o aluno logado lá clica em
 * "Catálogo" e chega aqui já logado. A Academy assina um bilhete de 1 minuto com uma chave derivada do hottok que ela
 * já usa para avisar as vendas (CATALOGO_WEBHOOK_TOKEN lá, um dos HOTMART_HOTTOK aqui): sem variável nova.
 */
export type AcademyTicket = { email: string; name: string };

const keyOf = (hottok: string) => createHmac('sha256', hottok).update('academy-sso-v1').digest('hex');

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Bilhete válido (assinatura certa, destino "catalogo", dentro do prazo) → e-mail e nome do aluno. */
export function readAcademyTicket(token: string | null): AcademyTicket | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const signed = hottoks().some((h) => sameText(sig, createHmac('sha256', keyOf(h)).update(body).digest('base64url')));
  if (!signed) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (data.aud !== 'catalogo' || typeof data.exp !== 'number' || data.exp * 1000 < Date.now()) return null;
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!email.includes('@')) return null;
    return { email, name: typeof data.name === 'string' ? data.name.trim().slice(0, 120) : '' };
  } catch {
    return null;
  }
}

/**
 * Conta do aluno no catálogo. Quem comprou já tem (a venda cria). Quem não tem ganha agora o mesmo acesso que uma
 * venda da Academy libera (com o e-mail único do MVA). Conta bloqueada por reembolso continua bloqueada.
 */
export async function academyUser(ticket: AcademyTicket): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { email: ticket.email }, select: { id: true, planSource: true } });
  if (existing) return existing.planSource === 'kiwify_refunded' ? null : existing.id;
  const result = await grantAccess({ name: ticket.name, email: ticket.email, source: 'brain_academy' });
  if (result.created) {
    const mail = await deliverMvaAccess({ ...result, source: 'brain_academy' });
    if (!mail.ok) console.error(`[academy-sso] conta criada para ${ticket.email}, mas o e-mail falhou: ${mail.error}`);
  }
  console.log(`[academy-sso] conta criada pela Central de ferramentas: ${ticket.email}`);
  return result.userId;
}
