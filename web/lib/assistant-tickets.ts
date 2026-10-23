import { waitUntil } from '@vercel/functions';
import { prisma } from '@/lib/db';
import { ASSISTANTS, PLATFORM_FACTS, retrieve, whatsappLink, type AssistantId } from '@/lib/assistant';
import { botUser, chat, isBotEmail } from '@/lib/assistant-community';
import { emailTicketReply } from '@/lib/community-data';

/**
 * A IA de suporte nos tickets.
 *
 * Quando um membro abre um ticket ou responde no seu próprio ticket, o
 * assistente certo responde como mensagem da equipe (fromSupport), assinando
 * como pessoa. Se alguém da equipe humana já respondeu na thread, a IA se
 * cala: o ticket passou a ser de uma pessoa. Quando a base não cobre, a
 * resposta é o encaminhamento ao WhatsApp, igual ao widget e à comunidade.
 */
const ESCALATE_TAG = '[[ESCALAR]]';
const MAX_BOT_REPLIES_PER_TICKET = 4;

/** Categorias de tráfego/vendas vão para Mateo; o resto para Sofía (plataforma, acesso, compra). */
function assistantFor(category: string): AssistantId {
  return category === 'ventas' || category === 'herramientas' ? 'trafico' : 'general';
}

export type TicketOutcome = 'replied' | 'skipped' | 'escalated';

function ticketPrompt(assistant: AssistantId, hits: Array<{ title: string; content: string }>, firstName: string, subject: string, hasKnowledge: boolean) {
  const a = ASSISTANTS[assistant];
  const context = hits.length ? hits.map((h, i) => `[${i + 1}] (${h.title})\n${h.content}`).join('\n\n') : '(ningún fragmento relevante)';
  return `${a.persona}

Estás respondiendo un TICKET DE SOPORTE privado de ${firstName}, con asunto "${subject}". Reglas:
- Español neutro, tono cercano y directo. Máximo unas 150 palabras. Texto plano, guiones para pasos si hace falta. Sin encabezados ni markdown.
- Eres una persona del equipo; nunca digas que eres una IA, un bot ni un asistente virtual, ni hables de "fragmentos" o "base de datos".
- Responde solo lo que respalden los FRAGMENTOS DE LAS CLASES o conocimiento general sólido. No inventes procedimientos, precios ni plazos del curso.
- Si la respuesta sale de una clase, cierra recomendando verla en el área de miembros, nombrando módulo y clase tal como aparecen en el título del fragmento.
- Si el miembro adjuntó archivos (audio, foto, PDF), no puedes abrirlos: pide que resuma por escrito lo esencial, salvo que el texto ya lo explique.
- Si no puedes resolverlo con seguridad, o hace falta una persona del equipo (acceso que no llegó, contraseña, pagos, reembolsos, cancelación, créditos, errores que se repiten, casos personales), dilo en una frase, pide que escriba al WhatsApp del equipo y termina con el texto exacto ${ESCALATE_TAG}.
${hasKnowledge ? '' : '\nAviso interno: todavía no hay material del curso cargado. Ayuda con lo que sepas con seguridad y, en dudas específicas del curso, deriva al equipo.'}

${PLATFORM_FACTS}

FRAGMENTOS DE LAS CLASES:
${context}`;
}

/**
 * Responde o ticket (ou não). Mesmo com a IA desligada é seguro chamar:
 * sem OPENROUTER_API_KEY o `chat` lança e o erro fica no log do agendador.
 */
export async function processTicket(ticketId: string): Promise<TicketOutcome> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: true,
      messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, email: true, isAdmin: true } } } },
    },
  });
  if (!ticket || ticket.status === 'resuelto' || ticket.messages.length === 0) return 'skipped';
  if (isBotEmail(ticket.user.email)) return 'skipped'; // a IA não abre tickets, mas por segurança

  const last = ticket.messages[ticket.messages.length - 1];
  if (last.fromSupport) return 'skipped'; // já respondido: nada a fazer
  // uma pessoa da equipe já respondeu neste ticket: assumiu, a IA para
  if (ticket.messages.some((m) => m.fromSupport && !isBotEmail(m.author.email))) return 'skipped';
  const botReplies = ticket.messages.filter((m) => isBotEmail(m.author.email)).length;
  if (botReplies >= MAX_BOT_REPLIES_PER_TICKET) return 'skipped';

  const assistant = assistantFor(ticket.category);
  const bot = await botUser(assistant);
  const firstName = ticket.user.name.split(' ')[0] || ticket.user.name;

  // só as mensagens do membro alimentam a busca: a dúvida está nelas
  const memberText = ticket.messages.filter((m) => !m.fromSupport).map((m) => m.content).join(' ');
  const [hits, docCount] = await Promise.all([
    retrieve(assistant, `${ticket.subject} ${memberText}`),
    prisma.knowledgeDoc.count({ where: { assistant } }),
  ]);

  const history = ticket.messages.map((m) => ({
    role: m.fromSupport ? ('assistant' as const) : ('user' as const),
    content: m.attachments.length
      ? `${m.content || '(sin texto)'} [adjuntó ${m.attachments.length === 1 ? 'un archivo' : `${m.attachments.length} archivos`}]`
      : m.content,
  }));

  const raw = await chat(
    [{ role: 'system', content: ticketPrompt(assistant, hits, firstName, ticket.subject, docCount > 0) }, ...history],
    700,
  );

  const escalate = raw.includes(ESCALATE_TAG) || !raw.replace(ESCALATE_TAG, '').trim();
  let text = raw.replace(ESCALATE_TAG, '').trim();
  if (!text) text = `Hola ${firstName}, para resolver esto necesito que lo vea una persona del equipo.`;
  if (escalate) text += `\n\nEscríbenos por WhatsApp: ${whatsappLink(assistant, `${ticket.subject}: ${memberText.slice(0, 100)}`)}`;

  // mesmo efeito de uma resposta humana em replyTicket: mensagem, estado e aviso ao membro
  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId, authorId: bot.id, content: text, fromSupport: true } }),
    prisma.ticket.update({ where: { id: ticketId }, data: { lastMessageAt: new Date(), status: 'en_progreso' } }),
    prisma.notification.create({
      data: {
        userId: ticket.userId,
        title: 'El equipo respondió tu ticket',
        body: ticket.subject.slice(0, 80),
        route: `/comunidade/soporte/${ticket.id}`,
      },
    }),
  ]);
  await emailTicketReply(ticketId, bot.name, text);

  return escalate ? 'escalated' : 'replied';
}

function enabled() {
  return process.env.ASSISTANT_ENABLED === '1' && Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Versão agendada: roda depois da resposta HTTP, sem segurar a tela do
 * membro. waitUntil (Vercel) mantém a função viva até a promessa terminar.
 * Chamar depois de createTicket e de replyTicket (o processamento decide se
 * cabe responder).
 */
export function scheduleTicketReply(ticketId: string) {
  if (!enabled()) {
    console.log('[assistant-tickets] desligado (ASSISTANT_ENABLED/OPENROUTER_API_KEY)');
    return;
  }
  waitUntil(
    processTicket(ticketId)
      .then((r) => console.log('[assistant-tickets] ticket', ticketId, r))
      .catch((error) => console.error('[assistant-tickets] ticket', ticketId, error)),
  );
}
