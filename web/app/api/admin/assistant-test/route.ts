import { NextResponse } from 'next/server';
import { answer, isAssistant } from '@/lib/assistant';
import { prisma } from '@/lib/db';

/** Pergunta de teste ao assistente, em nome da conta admin (CRON_SECRET). */
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { assistant?: string; message?: string; chatId?: string };
  if (!body.assistant || !isAssistant(body.assistant)) return NextResponse.json({ message: 'assistant' }, { status: 400 });
  const admin = await prisma.user.findFirst({ where: { isAdmin: true }, orderBy: { createdAt: 'asc' } });
  if (!admin) return NextResponse.json({ message: 'sin admin' }, { status: 500 });
  try {
    return NextResponse.json(await answer({ userId: admin.id, assistant: body.assistant, chatId: body.chatId, message: body.message ?? '' }));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'error' }, { status: 502 });
  }
}
