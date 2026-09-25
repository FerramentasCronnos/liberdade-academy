export type PostCategory = 'dica' | 'resultado' | 'duvida' | 'motivacao';

export type SpaceKind = 'posts' | 'intro' | 'announcements';

export interface Space {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  kind: SpaceKind | string;
  order: number;
  postCount: number;
}

export interface PostAuthor {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  isAdmin: boolean;
}

export interface CommunityPost {
  id: string;
  author: PostAuthor;
  title?: string;
  content: string;
  image?: string;
  pinned: boolean;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
  category: PostCategory | string;
  tags: string[];
  attachments: string[];
  /** Chat de suporte: atendimento finalizado. */
  resolvedAt?: string;
  space?: { slug: string; name: string; emoji: string; kind: string };
}

/** Cor de cada espaço na barra lateral e na capa. Por slug, sem coluna no banco. */
export const SPACE_COLOR: Record<string, { dot: string; cover: string; ink: string }> = {
  presentaciones:    { dot: '#7cc7a1', cover: 'linear-gradient(135deg,#c9e9d6 0%,#a9dcc0 100%)', ink: '#1f3d2e' },
  anuncios:          { dot: '#8b7cf0', cover: 'linear-gradient(135deg,#ded8fb 0%,#c3b8f7 100%)', ink: '#2c2260' },
  'soporte-general': { dot: '#f0a35c', cover: 'linear-gradient(135deg,#fde7cf 0%,#f8cfa3 100%)', ink: '#5a3410' },
  trafico:           { dot: '#5ea8f0', cover: 'linear-gradient(135deg,#d6e8fb 0%,#b4d3f5 100%)', ink: '#163b63' },
  resultados:        { dot: '#3fc48a', cover: 'linear-gradient(135deg,#d3f3e3 0%,#a8e8c8 100%)', ink: '#134a31' },
};

export function spaceColor(slug: string) {
  return SPACE_COLOR[slug] ?? { dot: '#9aa9c2', cover: 'linear-gradient(135deg,#e4e9f2 0%,#c6d0e0 100%)', ink: '#22304a' };
}

/** Sugestões do compositor. A pessoa pode escrever qualquer outra. */
export const SUGGESTED_TAGS = [
  'tiktok', 'shopee', 'amazon', 'meta ads', 'video', 'presell', 'whatsapp',
  'comisiones', 'primera venta', 'duda', 'consejo', 'motivación',
];

export function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, 24);
}

export type AttachmentKind = 'image' | 'audio' | 'video' | 'file';

/** Deduz o tipo pela extensão: é o que a URL do Blob preserva. */
export function attachmentKind(url: string): AttachmentKind {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (['webm', 'm4a', 'mp3', 'ogg', 'wav', 'aac', 'opus', 'weba'].includes(ext)) return 'audio';
  if (['mp4', 'mov'].includes(ext)) return 'video';
  return 'file';
}

export interface CommunityComment {
  id: string;
  author: PostAuthor;
  content: string;
  attachments: string[];
  createdAt: string;
  parentId?: string;
  replies: CommunityComment[];
}

export type TicketStatus = 'abierto' | 'en_progreso' | 'resuelto';

export const TICKET_CATEGORIES: Array<{ id: string; label: string; emoji: string; hint: string }> = [
  { id: 'acceso', label: 'Acceso', emoji: '🔑', hint: 'No puedo entrar, contraseña, correo' },
  { id: 'herramientas', label: 'Herramientas', emoji: '🧰', hint: 'Enlaces, presell, plantillas, catálogo' },
  { id: 'ventas', label: 'Ventas y comisiones', emoji: '💸', hint: 'Dudas sobre cómo vender o cobrar' },
  { id: 'pagos', label: 'Mi compra', emoji: '🧾', hint: 'Pago, factura, reembolso' },
  { id: 'otro', label: 'Otro', emoji: '💬', hint: 'Cualquier otra cosa' },
];

export function ticketCategory(id: string) {
  return TICKET_CATEGORIES.find((c) => c.id === id) ?? TICKET_CATEGORIES[TICKET_CATEGORIES.length - 1];
}

export interface TicketSummary {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus | string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  /** Última mensagem veio da equipe? Ajuda a ver quem está esperando resposta. */
  awaitingSupport: boolean;
  user: { id: string; name: string; avatar?: string; email?: string };
}

export interface TicketMessage {
  id: string;
  content: string;
  attachments: string[];
  createdAt: string;
  fromSupport: boolean;
  author: { id: string; name: string; avatar?: string };
}

export interface TicketDetail extends TicketSummary {
  messages: TicketMessage[];
}

export const TICKET_STATUS: Record<string, { label: string; className: string }> = {
  abierto: { label: 'Abierto', className: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' },
  en_progreso: { label: 'En progreso', className: 'bg-[var(--violet-soft)] text-[var(--brand)]' },
  resuelto: { label: 'Resuelto', className: 'bg-[var(--money-soft)] text-[var(--money)]' },
};

export const POST_CATEGORIES: Array<{ id: PostCategory; label: string; className: string }> = [
  { id: 'dica', label: 'Consejo', className: 'bg-[var(--violet-soft)] text-[var(--brand)]' },
  { id: 'resultado', label: 'Resultado', className: 'bg-[var(--money-soft)] text-[var(--money)]' },
  { id: 'duvida', label: 'Duda', className: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' },
  { id: 'motivacao', label: 'Motivación', className: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300' },
];

/** Categoria padrão de cada espaço: mantém o chip colorido dos posts antigos. */
export const SPACE_CATEGORY: Record<string, PostCategory> = {
  consejos: 'dica',
  resultados: 'resultado',
  dudas: 'duvida',
  motivacion: 'motivacao',
  presentaciones: 'motivacao',
  anuncios: 'dica',
};

export function categoryStyle(id: string) {
  return POST_CATEGORIES.find((c) => c.id === id);
}

/** "hace 2 h", "hace 3 días" — sem dependência de biblioteca de datas. */
export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;

  return new Date(iso).toLocaleDateString('es-419');
}

/** Cor estável do avatar a partir do nome — mesma pessoa, mesma cor. */
export function avatarColor(name: string) {
  const palette = ['#4b3fb0', '#0e7490', '#b45309', '#be185d', '#15803d', '#6d28d9'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
