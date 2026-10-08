import bcrypt from 'bcryptjs';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { ASSISTANTS, isAssistant, PLATFORM_FACTS, retrieve, whatsappLink, type AssistantId } from '@/lib/assistant';
import { addComment } from '@/lib/community-data';

/**
 * A IA de suporte dentro da comunidade.
 *
 * Quando um membro publica em Tráfico, Resultados ou no chat de Soporte
 * general, um classificador barato decide se é uma dúvida. Se for, o
 * assistente certo responde como comentário (ou na thread do chat),
 * assinando como pessoa da equipe. Se o membro continua na thread, a IA
 * continua; se alguém da equipe humana responde, a IA se cala.
 *
 * Apresentações e avisos nunca recebem resposta automática.
 */
const BOT_DOMAIN = 'bot.liberdade.academy';
const MAX_BOT_REPLIES_PER_POST = 4;

const SPACE_ASSISTANT: Record<string, AssistantId> = {
  'soporte-general': 'general',
  trafico: 'trafico',
  resultados: 'general',
};

export function isBotEmail(email: string) {
  return email.endsWith(`@${BOT_DOMAIN}`);
}

/** Conta da equipe que assina as respostas. Admin para ter o selo e falar no chat. */
async function botUser(assistant: AssistantId) {
  const email = `${assistant}@${BOT_DOMAIN}`;
  const name = `${ASSISTANTS[assistant].agent} · Equipo MVA`;
  return prisma.user.upsert({
    where: { email },
    update: { name, isAdmin: true },
    create: {
      email,
      name,
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
      isAdmin: true,
      onboardingCompleted: true,
      planSource: 'bot',
    },
  });
}

async function chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, maxTokens: number) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada.');
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-5.5';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Liberdade Academy' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

/** É uma dúvida ou pedido de ajuda? Classificação curta e barata. */
async function isQuestion(text: string) {
  const t = text.trim();
  if (t.length < 8) return false;
  const verdict = await chat(
    [
      {
        role: 'system',
        content:
          'Eres un clasificador. Recibes una publicación de la comunidad de un curso de ventas y marketing. Responde solo SI si la publicación es una duda, pregunta o pedido de ayuda (técnica, de la plataforma, de tráfico, de ventas o del curso) que un agente de soporte debería responder. Responde NO si es una presentación, un resultado compartido, una celebración, un comentario, un aviso o cualquier cosa que no pida ayuda.',
      },
      { role: 'user', content: t.slice(0, 1500) },
    ],
    3,
  );
  return /^s[ií]/i.test(verdict);
}

const ESCALATE_TAG = '[[ESCALAR]]';

function communityPrompt(assistant: AssistantId, hits: Array<{ title: string; content: string }>, firstName: string) {
  const a = ASSISTANTS[assistant];
  const context = hits.length ? hits.map((h, i) => `[${i + 1}] (${h.title})\n${h.content}`).join('\n\n') : '(ningún fragmento relevante)';
  return `${a.persona}

Estás respondiendo EN PÚBLICO, como comentario en la comunidad del curso, a ${firstName}. Reglas:
- Español neutro, tono cercano y directo. Máximo unas 120 palabras. Texto plano, guiones si hace falta.
- Eres una persona del equipo; no digas que eres una IA ni hables de "fragmentos" o "base de datos".
- Responde solo lo que respalden los FRAGMENTOS DE LAS CLASES o conocimiento general sólido. No inventes procedimientos, precios ni plazos del curso.
- Si la respuesta sale de una clase, cierra recomendando verla, con módulo y clase como aparecen en el título del fragmento.
- Si no puedes resolverlo con seguridad, o hace falta una persona del equipo (acceso, pagos, reembolsos, créditos, errores), dilo en una frase, pide que escriba al WhatsApp del equipo y termina con el texto exacto ${ESCALATE_TAG}.

${PLATFORM_FACTS}

FRAGMENTOS DE LAS CLASES:
${context}`;
}

interface Thread {
  postId: string;
  assistant: AssistantId;
  authorName: string;
  authorId: string;
  content: string;
  comments: Array<{ authorId: string; isBot: boolean; isHumanAdmin: boolean; content: string }>;
}

async function loadThread(postId: string): Promise<Thread | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      space: true,
      comments: { orderBy: { createdAt: 'asc' }, include: { author: true } },
    },
  });
  if (!post?.space) return null;
  const assistant = SPACE_ASSISTANT[post.space.slug];
  if (!assistant || !isAssistant(assistant)) return null;
  if (post.author.isAdmin) return null; // equipe não precisa de resposta automática

  return {
    postId: post.id,
    assistant,
    authorName: post.author.name,
    authorId: post.author.id,
    content: post.content,
    comments: post.comments.map((c) => ({
      authorId: c.author.id,
      isBot: isBotEmail(c.author.email),
      isHumanAdmin: c.author.isAdmin && !isBotEmail(c.author.email),
      content: c.content,
    })),
  };
}

async function reply(thread: Thread) {
  const bot = await botUser(thread.assistant);
  const firstName = thread.authorName.split(' ')[0] || thread.authorName;
  const question = [thread.content, ...thread.comments.filter((c) => c.authorId === thread.authorId).map((c) => c.content)].join(' ');
  const hits = await retrieve(thread.assistant, question);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: communityPrompt(thread.assistant, hits, firstName) },
    { role: 'user', content: thread.content },
    ...thread.comments
      .filter((c) => c.isBot || c.authorId === thread.authorId)
      .map((c) => ({ role: c.isBot ? ('assistant' as const) : ('user' as const), content: c.content })),
  ];

  const raw = await chat(messages, 600);
  const escalate = raw.includes(ESCALATE_TAG);
  let text = raw.replace(ESCALATE_TAG, '').trim();
  if (escalate) text += `\n\nEscríbenos por WhatsApp: ${whatsappLink(thread.assistant, thread.content.slice(0, 120))}`;
  if (!text) return;

  await addComment({ userId: bot.id, postId: thread.postId, content: text });
}

function enabled() {
  return process.env.ASSISTANT_ENABLED === '1' && Boolean(process.env.OPENROUTER_API_KEY);
}

/** Publicação nova: responde se for dúvida. Devolve o que aconteceu (para testes). */
export async function processPost(postId: string): Promise<'replied' | 'not-a-question' | 'skipped'> {
  const thread = await loadThread(postId);
  if (!thread || thread.comments.length > 0) return 'skipped';
  if (!(await isQuestion(thread.content))) return 'not-a-question';
  await reply(thread);
  return 'replied';
}

/** Comentário novo do membro numa thread onde a IA já respondeu: continua. */
export async function processComment(postId: string, commentAuthorId: string): Promise<'replied' | 'skipped'> {
  const thread = await loadThread(postId);
  if (!thread || thread.authorId !== commentAuthorId) return 'skipped'; // só o autor da dúvida segue a conversa
  const botReplies = thread.comments.filter((c) => c.isBot).length;
  if (botReplies === 0 || botReplies >= MAX_BOT_REPLIES_PER_POST) return 'skipped';
  // uma pessoa da equipe assumiu depois da última resposta da IA: a IA para
  const lastBot = thread.comments.map((c) => c.isBot).lastIndexOf(true);
  if (thread.comments.slice(lastBot + 1).some((c) => c.isHumanAdmin)) return 'skipped';
  await reply(thread);
  return 'replied';
}

/** Versões agendadas: rodam depois da resposta HTTP, sem segurar a tela. */
export function scheduleReplyToPost(postId: string) {
  if (!enabled()) return;
  after(() => processPost(postId).catch((error) => console.error('[assistant-community] post', postId, error)));
}

export function scheduleReplyToComment(postId: string, commentAuthorId: string) {
  if (!enabled()) return;
  after(() => processComment(postId, commentAuthorId).catch((error) => console.error('[assistant-community] comment', postId, error)));
}
