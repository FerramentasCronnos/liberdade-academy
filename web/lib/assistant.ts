import { prisma } from '@/lib/db';

/**
 * Assistentes de IA de suporte, via OpenRouter.
 *
 * Dois personagens com bases de conhecimento separadas. A resposta nasce
 * dos trechos mais relevantes das aulas (busca de texto em espanhol no
 * Postgres); quando a base não cobre, o assistente diz isso e a tela
 * oferece o WhatsApp da equipe. Nada de inventar procedimento.
 */
export type AssistantId = 'general' | 'trafico';

export const ASSISTANTS: Record<AssistantId, { name: string; emoji: string; tagline: string; persona: string }> = {
  general: {
    name: 'Soporte general',
    emoji: '🛟',
    tagline: 'Plataforma, acceso, herramientas y cómo empezar.',
    persona:
      'Eres el asistente de soporte general de Liberdade Academy, la plataforma del curso Máquina de Ventas Automáticas (MVA). Ayudas a los miembros con la plataforma (catálogo, enlaces, presell, comunidad, misiones), con el acceso y con los primeros pasos como afiliados de TikTok Shop, Amazon y Shopee.',
  },
  trafico: {
    name: 'Tráfico',
    emoji: '🚀',
    tagline: 'Meta Ads, Google Ads, TikTok y contenido que vende.',
    persona:
      'Eres el asistente de tráfico de Liberdade Academy (curso MVA). Ayudas a los miembros con tráfico pago y orgánico: Meta Ads, Google Ads, TikTok, ganchos, creativos, presupuesto, métricas y optimización de campañas para vender como afiliados.',
  },
};

export function isAssistant(value: string): value is AssistantId {
  return value === 'general' || value === 'trafico';
}

const ESCALATE_TAG = '[[ESCALAR]]';

export function whatsappLink(assistant: AssistantId, question?: string) {
  const number = process.env.SUPPORT_WHATSAPP || '5588951574640';
  const text = `Hola, vengo de Liberdade Academy (${ASSISTANTS[assistant].name}). ${question ? `Mi duda: ${question}` : 'Necesito ayuda.'}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text.slice(0, 500))}`;
}

/* --------------------------------------------------------------- retrieval */

interface ChunkHit {
  content: string;
  title: string;
  rank: number;
}

/** Trechos mais relevantes da base do assistente para a pergunta. */
export async function retrieve(assistant: AssistantId, question: string, limit = 6): Promise<ChunkHit[]> {
  const q = question.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().slice(0, 300);
  if (!q) return [];
  try {
    return await prisma.$queryRaw<ChunkHit[]>`
      SELECT c."content", d."title", ts_rank(c."search", websearch_to_tsquery('spanish', ${q})) AS rank
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON d."id" = c."docId"
      WHERE c."assistant" = ${assistant}
        AND c."search" @@ websearch_to_tsquery('spanish', ${q})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------- OpenRouter */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function complete(messages: ChatMessage[]) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada.');
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-5.5';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://catalogo.s4accelerator.com',
      'X-Title': 'Liberdade Academy',
    },
    body: JSON.stringify({ model, messages, max_tokens: 700, temperature: 0.3 }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function systemPrompt(assistant: AssistantId, hits: ChunkHit[], hasKnowledge: boolean) {
  const a = ASSISTANTS[assistant];
  const context = hits.length
    ? hits.map((h, i) => `[${i + 1}] (${h.title})\n${h.content}`).join('\n\n')
    : '(ningún fragmento relevante)';

  return `${a.persona}

Reglas:
- Responde siempre en español neutro, con tono cercano y directo, como un compañero experimentado. Frases cortas. Nada de relleno.
- Basa tus respuestas en los FRAGMENTOS DE LAS CLASES de abajo. Puedes complementar con conocimiento general sólido del tema, dejando claro qué viene del curso.
- Si la pregunta no está cubierta por las clases ni por conocimiento general confiable, o si requiere acción de una persona del equipo (acceso, pagos, reembolsos, errores de la plataforma, casos personales), dilo con honestidad en una frase y termina tu respuesta con el texto exacto ${ESCALATE_TAG} para que el miembro hable con el equipo humano.
- Nunca inventes datos del curso, precios, plazos ni procedimientos.
- Si el miembro pide hablar con una persona, responde brevemente y termina con ${ESCALATE_TAG}.
- Formato: texto plano. Usa guiones para pasos cuando ayude. Sin encabezados ni markdown pesado.
${hasKnowledge ? '' : '\nAviso: la base de conocimiento de este asistente todavía está vacía. Ayuda con lo que sepas con seguridad y, en dudas específicas del curso, deriva al equipo.'}

FRAGMENTOS DE LAS CLASES:
${context}`;
}

/* ------------------------------------------------------------------ chats */

export async function answer(input: {
  userId: string;
  assistant: AssistantId;
  chatId?: string;
  message: string;
}) {
  const message = input.message.trim().slice(0, 2000);
  if (!message) throw new Error('Escribe tu pregunta.');

  // conversa: reaproveita a aberta ou cria
  let chat = input.chatId
    ? await prisma.supportChat.findFirst({ where: { id: input.chatId, userId: input.userId } })
    : null;
  if (!chat) {
    chat = await prisma.supportChat.create({ data: { userId: input.userId, assistant: input.assistant } });
  }

  const history = await prisma.supportMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: 'asc' },
    take: 12,
  });

  const [hits, docCount] = await Promise.all([
    retrieve(input.assistant, message),
    prisma.knowledgeDoc.count({ where: { assistant: input.assistant } }),
  ]);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(input.assistant, hits, docCount > 0) },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ];

  const raw = await complete(messages);
  const escalate = raw.includes(ESCALATE_TAG);
  const reply = raw.replace(ESCALATE_TAG, '').trim() || 'No encontré una respuesta clara para eso. Te paso con el equipo.';

  await prisma.$transaction([
    prisma.supportMessage.create({ data: { chatId: chat.id, role: 'user', content: message } }),
    prisma.supportMessage.create({ data: { chatId: chat.id, role: 'assistant', content: reply } }),
    prisma.supportChat.update({ where: { id: chat.id }, data: { escalated: chat.escalated || escalate } }),
  ]);

  return {
    chatId: chat.id,
    reply,
    escalate,
    whatsapp: escalate ? whatsappLink(input.assistant, message) : undefined,
    sources: hits.slice(0, 3).map((h) => h.title),
  };
}
