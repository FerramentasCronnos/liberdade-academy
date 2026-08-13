export type PostCategory = 'dica' | 'resultado' | 'duvida' | 'motivacao';

export interface CommunityPost {
  id: string;
  author: { id: string; name: string; avatar?: string; level: number };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
  category: PostCategory | string;
}

export const POST_CATEGORIES: Array<{ id: PostCategory; label: string; className: string }> = [
  { id: 'dica', label: 'Consejo', className: 'bg-[var(--violet-soft)] text-[var(--brand)]' },
  { id: 'resultado', label: 'Resultado', className: 'bg-[var(--money-soft)] text-[var(--money)]' },
  { id: 'duvida', label: 'Duda', className: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300' },
  { id: 'motivacao', label: 'Motivación', className: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300' },
];

export function categoryStyle(id: string) {
  return POST_CATEGORIES.find((c) => c.id === id);
}

/** "há 2 h", "há 3 dias" — sem dependência de biblioteca de datas. */
export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;

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
