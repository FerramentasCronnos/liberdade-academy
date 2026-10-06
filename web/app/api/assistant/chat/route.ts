import { NextResponse } from 'next/server';
import { answer, isAssistant } from '@/lib/assistant';
import { getUserId } from '@/lib/session';

export const maxDuration = 60;

/** Uma pergunta ao assistente. Exige sessão: o widget só existe logado. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: 'Sesión expirada.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { assistant?: string; chatId?: string; message?: string; attachments?: unknown };
  // só imagens do nosso Blob
  const attachments = (Array.isArray(body.attachments) ? body.attachments : [])
    .filter((u): u is string => typeof u === 'string' && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(u))
    .slice(0, 4);
  if (!body.assistant || !isAssistant(body.assistant)) {
    return NextResponse.json({ message: 'Elige un asistente.' }, { status: 400 });
  }

  try {
    const result = await answer({ userId, assistant: body.assistant, chatId: body.chatId, message: body.message ?? '', attachments });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[assistant]', error);
    return NextResponse.json({ message: 'El asistente no pudo responder ahora. Inténtalo de nuevo o habla con el equipo.' }, { status: 502 });
  }
}
