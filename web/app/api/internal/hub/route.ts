import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hubList, hubLookup, hubSendPasswordEmail, hubSendReset, hubSetPassword, hubSupportChat, hubSupportRecent, validHubToken } from '@/lib/hub';

// Porta interna do Admin MVA (painel geral do MVA). Só ele conhece a chave (ver lib/hub.ts).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const email = z.string().trim().toLowerCase().email();
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('lookup'), email }),
  z.object({ action: z.literal('support-chat'), email, chatId: z.string().min(1).max(80) }),
  z.object({ action: z.literal('support-recent'), days: z.number().int().min(1).max(90).default(14) }),
  z.object({ action: z.literal('set-password'), email, password: z.string().min(8).max(200) }),
  z.object({ action: z.literal('send-reset'), email }),
  z.object({
    action: z.literal('send-password-email'),
    email,
    name: z.string().trim().max(120).default(''),
    password: z.string().min(8).max(200),
    systems: z.object({ catalogo: z.boolean(), brain: z.boolean(), academy: z.boolean() }),
  }),
]);

export async function POST(request: Request) {
  if (!validHubToken(request.headers.get('authorization'))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 422 });
  const body = parsed.data;
  try {
    switch (body.action) {
      case 'list':
        return NextResponse.json(await hubList());
      case 'lookup':
        return NextResponse.json(await hubLookup(body.email));
      case 'support-chat':
        return NextResponse.json(await hubSupportChat(body.email, body.chatId));
      case 'support-recent':
        return NextResponse.json(await hubSupportRecent(body.days));
      case 'set-password':
        return NextResponse.json(await hubSetPassword(body.email, body.password));
      case 'send-reset':
        return NextResponse.json(await hubSendReset(body.email));
      case 'send-password-email':
        return NextResponse.json(
          await hubSendPasswordEmail({ email: body.email, name: body.name || body.email.split('@')[0], password: body.password, systems: body.systems }),
        );
    }
  } catch (error) {
    console.error(`[hub] ${body.action} falhou:`, (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
