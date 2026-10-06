import { NextResponse } from 'next/server';
import { answer, isAssistant } from '@/lib/assistant';
import { getUserId } from '@/lib/session';

export const maxDuration = 60;

/** Uma pergunta ao assistente. Exige sessão: o widget só existe logado. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: 'Sesión expirada.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { assistant?: string; chatId?: string; message?: string };
  if (!body.assistant || !isAssistant(body.assistant)) {
    return NextResponse.json({ message: 'Elige un asistente.' }, { status: 400 });
  }

  try {
    const result = await answer({ userId, assistant: body.assistant, chatId: body.chatId, message: body.message ?? '' });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[assistant]', error);
    return NextResponse.json({ message: 'El asistente no pudo responder ahora. Inténtalo de nuevo o habla con el equipo.' }, { status: 502 });
  }
}
