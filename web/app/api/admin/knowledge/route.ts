import { NextResponse } from 'next/server';
import { isAssistant } from '@/lib/assistant';
import { addDocument, extractText, listDocuments, translateToSpanish } from '@/lib/knowledge';
import { prisma } from '@/lib/db';

/**
 * Base de conhecimento por API (CRON_SECRET), para carregar as aulas em lote:
 *   curl -F assistant=trafico -F title="Clase 1" -F file=@clase1.pdf …/api/admin/knowledge
 * `-F translate=1` traduz para espanhol antes de indexar (material em português).
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  return NextResponse.json({ docs: await listDocuments() });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  const form = await request.formData();
  const assistant = String(form.get('assistant') || '');
  if (!isAssistant(assistant)) return NextResponse.json({ message: 'assistant: general | trafico' }, { status: 400 });
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ message: 'Envíe "file".' }, { status: 400 });
  const title = String(form.get('title') || '').trim() || file.name.replace(/\.[^.]+$/, '');
  try {
    let text = await extractText(file);
    const translated = form.get('translate') === '1';
    if (translated) text = await translateToSpanish(text);
    const result = await addDocument({ assistant, title, filename: file.name, text });
    return NextResponse.json({ ok: true, title, translated, chars: text.length, ...result });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'error' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id' }, { status: 400 });
  await prisma.knowledgeDoc.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
