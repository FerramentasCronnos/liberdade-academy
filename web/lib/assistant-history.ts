import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ASSISTANTS, isAssistant } from '@/lib/assistant';

/**
 * Histórico da IA de suporte para o painel admin: conversas do widget,
 * respostas da IA em tickets e números dos últimos dias. Tudo serializado
 * (datas em ISO) para passar direto a componentes de cliente.
 */
const BOT_DOMAIN = 'bot.liberdade.academy';
const DAY_MS = 86_400_000;

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  attachments: string[];
}

export interface AssistantConversation {
  id: string;
  assistant: string;
  /** Nome do personagem (Sofía/Mateo) para a lista não mostrar só o id. */
  agent: string;
  escalated: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  user: { id: string; name: string; email: string; avatar?: string };
  messages: AssistantHistoryMessage[];
}

export interface AssistantTicketReply {
  ticketId: string;
  subject: string;
  category: string;
  status: string;
  assistant: string;
  agent: string;
  /** Alguma resposta da IA terminou encaminhando ao WhatsApp. */
  escalated: boolean;
  createdAt: string;
  lastMessageAt: string;
  user: { id: string; name: string; email: string; avatar?: string };
  /** Cada resposta da IA com a mensagem do membro que a provocou. */
  exchanges: Array<{ question: AssistantHistoryMessage | null; answer: AssistantHistoryMessage }>;
}

export interface AssistantStats {
  last7: { conversations: number; escalated: number; ticketReplies: number };
  last30: { conversations: number; escalated: number; ticketReplies: number };
}

function agentName(assistant: string) {
  return isAssistant(assistant) ? ASSISTANTS[assistant].agent : assistant;
}

/** Conversas do widget, mais recentes primeiro. `cursor` é o id da última da página anterior. */
export async function listAssistantConversations(input: { assistant?: string; q?: string; take?: number; cursor?: string } = {}) {
  const take = Math.min(Math.max(input.take ?? 50, 1), 200);
  const q = input.q?.trim();

  const where: Prisma.SupportChatWhereInput = {
    ...(input.assistant ? { assistant: input.assistant } : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { messages: { some: { content: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.supportChat.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  const page = rows.slice(0, take);
  const conversations: AssistantConversation[] = page.map((c) => ({
    id: c.id,
    assistant: c.assistant,
    agent: agentName(c.assistant),
    escalated: c.escalated,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messageCount: c.messages.length,
    user: { id: c.user.id, name: c.user.name, email: c.user.email, avatar: c.user.avatar ?? undefined },
    messages: c.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments,
    })),
  }));

  return { conversations, nextCursor: rows.length > take ? page[page.length - 1].id : null };
}

/** Tickets em que a IA respondeu, mais recentes primeiro. */
export async function listAssistantTicketReplies(input: { take?: number } = {}): Promise<AssistantTicketReply[]> {
  const take = Math.min(Math.max(input.take ?? 50, 1), 200);
  const tickets = await prisma.ticket.findMany({
    where: { messages: { some: { fromSupport: true, author: { email: { endsWith: `@${BOT_DOMAIN}` } } } } },
    orderBy: { lastMessageAt: 'desc' },
    take,
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { email: true } } } },
    },
  });

  return tickets.map((t) => {
    const exchanges: AssistantTicketReply['exchanges'] = [];
    let assistant = 'general';
    let lastMember: AssistantHistoryMessage | null = null;
    for (const m of t.messages) {
      const msg: AssistantHistoryMessage = { role: m.fromSupport ? 'assistant' : 'user', content: m.content, createdAt: m.createdAt.toISOString(), attachments: m.attachments };
      if (!m.fromSupport) {
        lastMember = msg;
        continue;
      }
      if (!m.author.email.endsWith(`@${BOT_DOMAIN}`)) continue; // resposta humana: não é da IA
      assistant = m.author.email.split('@')[0] || assistant;
      exchanges.push({ question: lastMember, answer: msg });
      lastMember = null;
    }
    return {
      ticketId: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      assistant,
      agent: agentName(assistant),
      escalated: exchanges.some((e) => e.answer.content.includes('wa.me/')),
      createdAt: t.createdAt.toISOString(),
      lastMessageAt: t.lastMessageAt.toISOString(),
      user: { id: t.user.id, name: t.user.name, email: t.user.email, avatar: t.user.avatar ?? undefined },
      exchanges,
    };
  });
}

export async function assistantStats(): Promise<AssistantStats> {
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY_MS);
  const botAuthor = { author: { email: { endsWith: `@${BOT_DOMAIN}` } } };

  const count = async (days: number) => {
    const gte = since(days);
    const [conversations, escalated, ticketReplies] = await Promise.all([
      prisma.supportChat.count({ where: { createdAt: { gte } } }),
      prisma.supportChat.count({ where: { createdAt: { gte }, escalated: true } }),
      prisma.ticketMessage.count({ where: { createdAt: { gte }, fromSupport: true, ...botAuthor } }),
    ]);
    return { conversations, escalated, ticketReplies };
  };

  const [last7, last30] = await Promise.all([count(7), count(30)]);
  return { last7, last30 };
}
