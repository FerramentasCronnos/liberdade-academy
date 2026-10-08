import { prisma } from '@/lib/db';
import type { AssistantId } from '@/lib/assistant';

/**
 * Base de conhecimento: recebe o arquivo da aula, extrai o texto e grava
 * em trechos pesquisáveis. PDF, DOCX, TXT, MD, SRT e VTT.
 */
const CHUNK = 1400;
const OVERLAP = 200;

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as (b: Buffer) => Promise<{ text: string }>;
    return (await pdfParse(buffer)).text;
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ buffer })).value;
  }
  let text = buffer.toString('utf8');
  if (name.endsWith('.srt') || name.endsWith('.vtt')) {
    // legendas: tira números de bloco e marcas de tempo, mantém as falas
    text = text
      .split(/\r?\n/)
      .filter((l) => l.trim() && !/^\d+$/.test(l.trim()) && !/\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(l) && !/^WEBVTT/.test(l))
      .join(' ');
  }
  return text;
}

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(clean.length, i + CHUNK);
    // corta em fim de frase quando possível
    if (end < clean.length) {
      const cut = clean.lastIndexOf('. ', end);
      if (cut > i + CHUNK / 2) end = cut + 1;
    }
    chunks.push(clean.slice(i, end).trim());
    if (end >= clean.length) break;
    i = Math.max(end - OVERLAP, i + 1);
  }
  return chunks.filter((c) => c.length > 40);
}

/**
 * Traduz o material para espanhol antes de indexar. As aulas chegam em
 * português e os membros perguntam em espanhol: sem isto a busca por
 * palavras não encontra nada ("presupuesto" nunca casa com "orçamento").
 */
export async function translateToSpanish(text: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada.');
  const model = process.env.OPENROUTER_TRANSLATE_MODEL || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-5.5';

  // blocos de ~6 mil caracteres cortados em parágrafo
  const blocks: string[] = [];
  let current = '';
  for (const para of text.split(/\n{2,}|\n(?=[A-ZÁÉÍÓÚ])/)) {
    if ((current + para).length > 6000 && current) {
      blocks.push(current);
      current = '';
    }
    current += (current ? '\n\n' : '') + para;
  }
  if (current) blocks.push(current);

  const out: string[] = [];
  for (const block of blocks) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 8000,
        messages: [
          {
            role: 'system',
            content:
              'Traduce al español neutro (latinoamericano) el texto que recibas. Es la transcripción de una clase de un curso de ventas y marketing (MVA, Máquina de Ventas Automáticas). Mantén el tono coloquial y directo del profesor, los ejemplos, los números y los nombres propios (BRAIN, MVA, TikTok Shop, Caique, Thaís). No resumas, no omitas nada, no agregues comentarios. Devuelve solo la traducción.',
          },
          { role: 'user', content: block },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Traducción falló: ${response.status}`);
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    out.push(data.choices?.[0]?.message?.content?.trim() ?? '');
  }
  return out.join('\n\n');
}

export async function addDocument(input: { assistant: AssistantId; title: string; filename?: string; text: string }) {
  const chunks = chunkText(input.text);
  if (!chunks.length) throw new Error('No encontré texto legible en el archivo.');

  const doc = await prisma.knowledgeDoc.create({
    data: { assistant: input.assistant, title: input.title, filename: input.filename, chars: input.text.length },
  });
  await prisma.knowledgeChunk.createMany({
    data: chunks.map((content, position) => ({ docId: doc.id, assistant: input.assistant, position, content })),
  });
  return { id: doc.id, chunks: chunks.length };
}

export async function listDocuments() {
  const docs = await prisma.knowledgeDoc.findMany({
    orderBy: [{ assistant: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { chunks: true } } },
  });
  return docs.map((d) => ({
    id: d.id,
    assistant: d.assistant,
    title: d.title,
    filename: d.filename ?? undefined,
    chars: d.chars,
    chunks: d._count.chunks,
    createdAt: d.createdAt.toISOString(),
  }));
}

export type KnowledgeDocItem = Awaited<ReturnType<typeof listDocuments>>[number];
