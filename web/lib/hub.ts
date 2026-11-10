import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ASSISTANTS, type AssistantId } from '@/lib/assistant';
import { activityDay } from '@/lib/activity';
import { requestPasswordReset } from '@/lib/password-reset';
import { sendHubPasswordEmail } from '@/lib/email';

/**
 * Admin MVA (painel geral do MVA: área de membros, catálogo e BRAIN num lugar só). Ele conversa com o catálogo por
 * uma porta interna (POST /api/internal/hub). A chave é derivada do JWT_SECRET (sem variável nova na Vercel); se o
 * JWT_SECRET mudar, a CATALOGO_HUB_KEY do Admin MVA precisa ser atualizada.
 */
export function hubKey(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado.');
  return createHmac('sha256', secret).update('mva-hub-v1').digest('hex');
}

export function validHubToken(header: string | null): boolean {
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !process.env.JWT_SECRET) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(hubKey());
  return a.length === b.length && timingSafeEqual(a, b);
}

const DAY_MS = 86_400_000;
const REVOKED = 'kiwify_refunded';
const BOT = '@bot.liberdade.academy';
const APP_URL = (process.env.APP_URL || 'https://catalogo.s4accelerator.com').replace(/\/$/, '');
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const assistantName = (id: string) => {
  const a = ASSISTANTS[id as AssistantId];
  return a ? `${a.agent} · ${a.name}` : id;
};
const ticketStatus = (s: string) => (s === 'abierto' ? 'aguardando a equipe' : s === 'en_progreso' ? 'em andamento' : 'resolvido');

type UserRow = { planSource: string | null; planExpiresAt: Date | null; plan: string; purchases: string[] };

function status(u: UserRow): string {
  if (u.planSource === REVOKED) return 'bloqueado';
  if (u.planExpiresAt && u.planExpiresAt.getTime() < Date.now()) return 'vencido';
  return 'ativo';
}

function planLabel(u: UserRow): string {
  return [u.plan, u.planSource].filter(Boolean).join(' · ');
}

const findUser = (email: string) => prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

/** Todas as contas (sem os perfis de robô da comunidade), resumidas. */
export async function hubList() {
  const rows = await prisma.user.findMany({
    where: { NOT: { email: { endsWith: BOT } } },
    select: { id: true, email: true, name: true, plan: true, planSource: true, planExpiresAt: true, purchases: true, createdAt: true, lastLoginAt: true, lastSeenAt: true },
  });
  return {
    accounts: rows.map((u) => ({
      id: u.id,
      email: u.email.toLowerCase(),
      aliases: [],
      name: u.name,
      createdAt: iso(u.createdAt),
      lastLoginAt: iso(u.lastLoginAt),
      lastSeenAt: iso(u.lastSeenAt),
      status: status(u),
      plan: planLabel(u),
    })),
  };
}

/** Ficha completa de uma pessoa. */
export async function hubLookup(email: string) {
  const u = await findUser(email);
  if (!u) return { account: null };
  const since = activityDay(new Date(Date.now() - 400 * DAY_MS));

  const [days, chats, tickets, chatPosts, posts, comments, lastPost, lastComment] = await Promise.all([
    prisma.userActivityDay.findMany({ where: { userId: u.id, day: { gte: since } }, orderBy: { day: 'asc' } }),
    prisma.supportChat.findMany({
      where: { userId: u.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        _count: { select: { messages: true } },
        messages: { where: { role: 'user' }, orderBy: { createdAt: 'asc' }, take: 1, select: { content: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { userId: u.id },
      orderBy: { lastMessageAt: 'desc' },
      take: 30,
      include: { _count: { select: { messages: true } }, messages: { orderBy: { createdAt: 'asc' }, take: 1, select: { content: true } } },
    }),
    // Espaços de chat da comunidade (ex.: Soporte): cada mensagem é um atendimento.
    prisma.post.findMany({
      where: { authorId: u.id, space: { kind: 'chat' } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { space: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
    prisma.post.count({ where: { authorId: u.id } }),
    prisma.comment.count({ where: { authorId: u.id } }),
    prisma.post.findFirst({ where: { authorId: u.id }, orderBy: { createdAt: 'desc' }, include: { space: { select: { name: true } } } }),
    prisma.comment.findFirst({ where: { authorId: u.id }, orderBy: { createdAt: 'desc' }, include: { post: { select: { id: true, title: true, content: true } } } }),
  ]);

  const review = (s: string | null) => (s === 'pending' ? 'aguardando moderação' : s === 'rejected' ? 'recusado' : 'publicado');
  return {
    account: {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: null,
      locale: null,
      createdAt: iso(u.createdAt),
      lastLoginAt: iso(u.lastLoginAt),
      lastSeenAt: iso(u.lastSeenAt),
      status: status(u),
      plan: planLabel(u),
      facts: [
        { label: 'Plano', value: `${u.plan}${u.planExpiresAt ? ` (até ${u.planExpiresAt.toISOString().slice(0, 10)})` : ''}` },
        { label: 'Origem do acesso', value: u.planSource === REVOKED ? 'Bloqueado por reembolso' : u.planSource || '—' },
        ...(u.purchases.length ? [{ label: 'Compras', value: u.purchases.join(', ') }] : []),
        { label: 'Onboarding', value: u.onboardingCompleted ? 'Concluído' : 'Não concluído' },
        { label: 'Pontos / nível', value: `${u.points} pts · nível ${u.level}` },
        ...(u.introducedAt ? [{ label: 'Apresentou-se na comunidade', value: u.introducedAt.toISOString().slice(0, 10), at: iso(u.introducedAt) }] : []),
        ...(u.creatorsAccess ? [{ label: 'Creators', value: u.creatorsAccessUntil ? `até ${u.creatorsAccessUntil.toISOString().slice(0, 10)}` : 'liberado' }] : []),
        ...(u.isAdmin ? [{ label: 'Administração', value: 'Sim' }] : []),
      ],
      activity: days.map((d) => ({ day: d.day, logins: d.logins, hits: d.hits, uses: 0 })),
      support: {
        chats: chats.map((c) => ({
          id: c.id,
          assistant: assistantName(c.assistant),
          escalated: c.escalated,
          startedAt: iso(c.createdAt),
          updatedAt: iso(c.updatedAt),
          messages: c._count.messages,
          preview: (c.messages[0]?.content ?? '').slice(0, 240),
        })),
        tickets: [
          ...tickets.map((t) => ({
            id: `ticket:${t.id}`,
            title: `Ticket · ${t.subject}`,
            status: ticketStatus(t.status),
            startedAt: iso(t.createdAt),
            updatedAt: iso(t.lastMessageAt),
            messages: t._count.messages,
            preview: (t.messages[0]?.content ?? '').slice(0, 240),
          })),
          ...chatPosts.map((p) => ({
            id: `post:${p.id}`,
            title: `Comunidade › ${p.space?.name ?? 'chat'}`,
            status: p.resolvedAt ? 'resolvido' : 'aberto',
            startedAt: iso(p.createdAt),
            updatedAt: iso(p.updatedAt),
            messages: 1 + p._count.comments,
            preview: p.content.slice(0, 240),
          })),
        ],
      },
      community: {
        posts,
        comments,
        lastPost: lastPost
          ? {
              at: iso(lastPost.createdAt),
              text: (lastPost.title ? `${lastPost.title} — ` : '') + lastPost.content.slice(0, 500),
              where: lastPost.space?.name ?? 'Comunidade',
              status: review(lastPost.reviewStatus),
              url: `${APP_URL}/comunidade/post/${lastPost.id}`,
            }
          : null,
        lastComment: lastComment
          ? {
              at: iso(lastComment.createdAt),
              text: lastComment.content.slice(0, 500),
              where: `No post: ${(lastComment.post.title || lastComment.post.content).slice(0, 80)}`,
              status: review(lastComment.reviewStatus),
              url: `${APP_URL}/comunidade/post/${lastComment.post.id}`,
            }
          : null,
      },
      adminUrl: `${APP_URL}/admin`,
    },
  };
}

type Message = { role: string; author?: string; content: string; at: string | null; images: number };

/** Mensagens de uma conversa (IA, ticket ou chat da comunidade), só se for dessa pessoa. */
export async function hubSupportChat(email: string, chatId: string): Promise<{ messages: Message[] }> {
  const u = await findUser(email);
  if (!u) return { messages: [] };
  if (chatId.startsWith('ticket:')) {
    const t = await prisma.ticket.findFirst({
      where: { id: chatId.slice(7), userId: u.id },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    });
    return {
      messages: (t?.messages ?? []).map((m) => ({ role: m.fromSupport ? 'team' : 'user', author: m.author.name, content: m.content, at: iso(m.createdAt), images: m.attachments.length })),
    };
  }
  if (chatId.startsWith('post:')) {
    const p = await prisma.post.findFirst({
      where: { id: chatId.slice(5), authorId: u.id },
      include: { comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, isAdmin: true } } } } },
    });
    if (!p) return { messages: [] };
    return {
      messages: [
        { role: 'user', author: u.name, content: p.content, at: iso(p.createdAt), images: p.attachments.length },
        ...p.comments.map((c) => ({
          role: c.authorId === u.id ? 'user' : 'team',
          author: c.author.name,
          content: c.content,
          at: iso(c.createdAt),
          images: c.attachments.length,
        })),
      ],
    };
  }
  const chat = await prisma.supportChat.findFirst({ where: { id: chatId, userId: u.id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  return {
    messages: (chat?.messages ?? []).map((m) => ({ role: m.role, content: m.content, at: iso(m.createdAt), images: m.attachments.length })),
  };
}

/** Conversas recentes: IA de suporte, tickets e chats da comunidade (todas as pessoas). */
export async function hubSupportRecent(days: number) {
  const since = new Date(Date.now() - Math.min(Math.max(days, 1), 90) * DAY_MS);
  const who = { select: { email: true, name: true } };
  const [chats, tickets, chatPosts] = await Promise.all([
    prisma.supportChat.findMany({
      where: { updatedAt: { gte: since } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      include: {
        user: who,
        _count: { select: { messages: true } },
        messages: { where: { role: 'user' }, orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { lastMessageAt: { gte: since } },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
      include: { user: who, _count: { select: { messages: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } } },
    }),
    prisma.post.findMany({
      where: { space: { kind: 'chat' }, updatedAt: { gte: since } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: { author: who, space: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
  ]);
  return {
    chats: [
      ...chats.map((c) => ({
        id: c.id,
        kind: 'ia',
        assistant: assistantName(c.assistant),
        escalated: c.escalated,
        startedAt: iso(c.createdAt),
        updatedAt: iso(c.updatedAt),
        email: c.user.email.toLowerCase(),
        name: c.user.name,
        messages: c._count.messages,
        preview: (c.messages[0]?.content ?? '').slice(0, 240),
      })),
      ...tickets.map((t) => ({
        id: `ticket:${t.id}`,
        kind: 'chamado',
        assistant: `Ticket · ${t.subject}`,
        escalated: t.status !== 'resuelto',
        startedAt: iso(t.createdAt),
        updatedAt: iso(t.lastMessageAt),
        email: t.user.email.toLowerCase(),
        name: t.user.name,
        messages: t._count.messages,
        preview: (t.messages[0]?.content ?? '').slice(0, 240),
      })),
      ...chatPosts
        .filter((p) => !p.author.email.endsWith(BOT))
        .map((p) => ({
          id: `post:${p.id}`,
          kind: 'comunidade',
          assistant: `Comunidade › ${p.space?.name ?? 'chat'}`,
          escalated: !p.resolvedAt,
          startedAt: iso(p.createdAt),
          updatedAt: iso(p.updatedAt),
          email: p.author.email.toLowerCase(),
          name: p.author.name,
          messages: 1 + p._count.comments,
          preview: p.content.slice(0, 240),
        })),
    ],
  };
}

/** Senha nova definida pela equipe (a mesma nos três sistemas). Conta bloqueada por reembolso continua bloqueada. */
export async function hubSetPassword(email: string, password: string) {
  const u = await findUser(email);
  if (!u) return { status: 'not_found' };
  if (u.planSource === REVOKED) return { status: 'blocked' };
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { status: 'updated' };
}

/** Link de "olvidé mi contraseña" do catálogo (vale 1 hora). */
export async function hubSendReset(email: string) {
  const result = await requestPasswordReset(email);
  return { status: result.sent ? 'sent' : (result.reason ?? 'failed') };
}

/** E-mail "tu nueva contraseña" (sai pelo remetente do MVA). */
export async function hubSendPasswordEmail(input: { email: string; name: string; password: string; systems: { catalogo: boolean; brain: boolean; academy: boolean } }) {
  const result = await sendHubPasswordEmail(input);
  return { status: result.ok ? 'sent' : 'failed', error: result.ok ? undefined : result.error };
}
