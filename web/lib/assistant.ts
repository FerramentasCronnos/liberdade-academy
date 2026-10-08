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

/**
 * Os assistentes se apresentam como pessoas da equipe de suporte (decisão
 * de produto): nome próprio, sem mencionar IA. Quem não resolve, ao final,
 * encaminha ao WhatsApp do time.
 */
export const ASSISTANTS: Record<AssistantId, { name: string; agent: string; emoji: string; tagline: string; persona: string }> = {
  general: {
    name: 'Soporte general',
    agent: 'Sofía',
    emoji: '🛟',
    tagline: 'Plataforma, acceso, herramientas y cómo empezar.',
    persona:
      'Te llamas Sofía y eres parte del equipo de soporte de Liberdade Academy, la plataforma del curso Máquina de Ventas Automáticas (MVA). Atiendes a los miembros con la plataforma (catálogo, enlaces, presell, comunidad, misiones), con el acceso y con los primeros pasos como afiliados de TikTok Shop, Amazon y Shopee.',
  },
  trafico: {
    name: 'Tráfico',
    agent: 'Mateo',
    emoji: '🚀',
    tagline: 'Meta Ads, Google Ads, TikTok y contenido que vende.',
    persona:
      'Te llamas Mateo y eres el especialista en tráfico del equipo de soporte de Liberdade Academy (curso MVA). Atiendes a los miembros en tráfico pago y orgánico: Meta Ads, Google Ads, TikTok, ganchos, creativos, presupuesto, métricas y optimización de campañas para vender como afiliados.',
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

/**
 * Trechos mais relevantes da base do assistente para a pergunta.
 *
 * Os termos entram com OU, não E: uma pergunta nunca repete todas as
 * palavras da aula. O ranking (ts_rank_cd) favorece os trechos que casam
 * mais termos. Stopwords somem no próprio dicionário espanhol.
 */
export async function retrieve(assistant: AssistantId, question: string, limit = 6): Promise<ChunkHit[]> {
  const hits = await retrieveRaw(assistant, question, limit * 3);
  // no máximo dois trechos por aula: uma aula longa não deve abafar as outras
  const perDoc = new Map<string, number>();
  const picked: ChunkHit[] = [];
  for (const h of hits) {
    const n = perDoc.get(h.title) ?? 0;
    if (n >= 2) continue;
    perDoc.set(h.title, n + 1);
    picked.push(h);
    if (picked.length >= limit) break;
  }
  return picked;
}

async function retrieveRaw(assistant: AssistantId, question: string, limit: number): Promise<ChunkHit[]> {
  const terms = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 16);
  if (!terms.length) return [];

  // primeiro exige todas as palavras (precisão); se achar pouco, relaxa para OU
  const strict = await runQuery(assistant, terms.join(' & '), limit).catch(() => []);
  if (strict.length >= 3) return strict;
  const loose = await runQuery(assistant, terms.join(' | '), limit).catch(() => []);
  const seen = new Set(strict.map((h) => h.content));
  return [...strict, ...loose.filter((h) => !seen.has(h.content))];
}

async function runQuery(assistant: AssistantId, tsquery: string, limit: number): Promise<ChunkHit[]> {
  try {
    return await prisma.$queryRaw<ChunkHit[]>`
      SELECT c."content", d."title", ts_rank_cd(c."search", to_tsquery('spanish', ${tsquery})) AS rank
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON d."id" = c."docId"
      WHERE c."assistant" = ${assistant}
        AND c."search" @@ to_tsquery('spanish', ${tsquery})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------- OpenRouter */

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
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
    body: JSON.stringify({ model, messages, max_tokens: 1400, temperature: 0.3 }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

const PLATFORM_FACTS = `DATOS FIJOS DE LA PLATAFORMA (úsalos con confianza):
- Plataforma: Liberdade Academy, en https://catalogo.s4accelerator.com (acceso con el correo de la compra). La BRAIN (IA del curso) tiene acceso aparte, enviado por correo y WhatsApp.
- Clase en vivo: una vez por semana, normalmente jueves a las 20:00 hora de Miami. El enlace se publica en el espacio "Novedades" de la comunidad, dentro de la plataforma.
- Comunidad (menú Comunidad): espacios Networking (preséntate), Novedades (avisos y enlaces de clases en vivo), Soporte general (chat con el equipo), Tráfico y Resultados. Los tickets de soporte se abren en Comunidad → Soporte → "Nuevo ticket".
- Catálogo: productos virales con filtros por nicho y por tienda (TikTok Shop, Amazon, Shopee). Cada producto muestra comisión estimada y enlace a la tienda.
- Herramientas: Generar Enlace, Página de Presell, Página para Bio, Plantillas, Baúl de Anuncios, Misiones, Recompensas y Ranking.
- BRAIN: la inteligencia artificial del curso, en https://s4.brainexperts.com.br, con acceso propio (correo con contraseña temporal, enviado al comprar; remitente "Brain IA"). La compra incluye 500 créditos, 1 video y 3 imágenes.
- ÚNICO canal humano: el WhatsApp del equipo de soporte, que aparece como botón en este chat cuando terminas con ${ESCALATE_TAG}. Todo lo que necesite a una persona (acceso que no llegó, contraseña, cobros, reembolsos, cancelación, créditos extra, cambio de perfil o de plan de la BRAIN, errores que se repiten, cualquier duda fuera del material) se deriva ahí. Aunque el material mencione un correo de soporte, NO lo des: pide que escriba por WhatsApp con el correo de su cuenta, lo que intentaba hacer y una captura.`;

function systemPrompt(assistant: AssistantId, hits: ChunkHit[], hasKnowledge: boolean) {
  const a = ASSISTANTS[assistant];
  const context = hits.length
    ? hits.map((h, i) => `[${i + 1}] (${h.title})\n${h.content}`).join('\n\n')
    : '(ningún fragmento relevante)';

  return `${a.persona}

Reglas:
- Hablas como una persona del equipo que atiende por chat: cercana, directa, en español neutro. Frases cortas. Nada de relleno.
- Eres una persona del equipo de soporte. Nunca digas que eres una inteligencia artificial, un asistente virtual, un bot ni un modelo; si te lo preguntan, responde que eres parte del equipo de soporte de MVA y sigue ayudando. No hables de "mi base de datos" ni de "fragmentos". Si no tienes la información, di simplemente que no la tienes a mano.
- Solo ofrece el contacto por WhatsApp (con ${ESCALATE_TAG}) cuando de verdad no puedas resolver la duda o cuando haga falta otra persona del equipo. Nunca lo ofrezcas de entrada.
- Si el miembro manda una captura o foto, descríbela solo en lo necesario y responde a lo que muestra (errores, pantallas, métricas, anuncios).
- Basa tus respuestas en los FRAGMENTOS DE LAS CLASES de abajo (material del curso). Puedes complementar con conocimiento general sólido del tema; cuando algo venga del curso, puedes decir "en el método MVA…".
- Si la pregunta no está cubierta por las clases ni por conocimiento general confiable, o si requiere acción de otra persona del equipo (acceso, pagos, reembolsos, errores de la plataforma, casos personales), dilo con honestidad en una frase y termina tu respuesta con el texto exacto ${ESCALATE_TAG}: así el miembro puede seguir por WhatsApp con el equipo.
- Nunca inventes datos del curso, precios, plazos ni procedimientos.
- Si el miembro pide hablar con una persona, responde brevemente y termina con ${ESCALATE_TAG}.
- Formato: texto plano. Usa guiones para pasos cuando ayude. Sin encabezados ni markdown pesado.
- Sé breve: lo esencial en pocas líneas (máximo unas 180 palabras). Si hace falta más, ofrece ampliar.
- Cuando la respuesta salga de una clase del curso, cierra recomendando verla en el área de miembros, nombrando módulo y clase tal como aparecen en el título del fragmento (ej.: "Esto lo ves completo en el Módulo 04, Clase 05: Cierre y objeciones, en el área de miembros").
${hasKnowledge ? '' : '\nAviso interno: todavía no hay material del curso cargado. Ayuda con lo que sepas con seguridad y, en dudas específicas del curso, deriva al equipo.'}

${PLATFORM_FACTS}

FRAGMENTOS DE LAS CLASES:
${context}`;
}

/* ------------------------------------------------------------------ chats */

export async function answer(input: {
  userId: string;
  assistant: AssistantId;
  chatId?: string;
  message: string;
  attachments?: string[];
}) {
  const message = input.message.trim().slice(0, 2000);
  const attachments = (input.attachments ?? []).slice(0, 4);
  if (!message && !attachments.length) throw new Error('Escribe tu pregunta.');

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

  // só a mensagem atual leva a imagem em si; no histórico fica a marca
  const current: ChatMessage = attachments.length
    ? {
        role: 'user',
        content: [
          { type: 'text', text: message || 'Te mando esta captura.' },
          ...attachments.map((url): ContentPart => ({ type: 'image_url', image_url: { url } })),
        ],
      }
    : { role: 'user', content: message };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(input.assistant, hits, docCount > 0) },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.attachments.length ? `${m.content} [envió ${m.attachments.length === 1 ? 'una captura' : 'capturas'}]` : m.content,
    })),
    current,
  ];

  const raw = await complete(messages);
  const escalate = raw.includes(ESCALATE_TAG);
  const reply = raw.replace(ESCALATE_TAG, '').trim() || 'No encontré una respuesta clara para eso. Te paso con el equipo.';

  await prisma.$transaction([
    prisma.supportMessage.create({ data: { chatId: chat.id, role: 'user', content: message, attachments } }),
    prisma.supportMessage.create({ data: { chatId: chat.id, role: 'assistant', content: reply } }),
    prisma.supportChat.update({ where: { id: chat.id }, data: { escalated: chat.escalated || escalate } }),
  ]);

  return {
    chatId: chat.id,
    reply,
    escalate,
    whatsapp: escalate ? whatsappLink(input.assistant, message || 'Te mandé una captura en el chat.') : undefined,
    sources: hits.slice(0, 3).map((h) => h.title),
  };
}
