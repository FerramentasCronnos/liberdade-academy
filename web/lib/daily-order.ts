/**
 * Ordem do catálogo que muda a cada dia (fuso de São Paulo), mas é a mesma o dia todo para todo mundo:
 * - 2 Bank Offers "do dia" fixos no topo, em rodízio (todas passam pelo topo);
 * - o resto embaralhado pelo dia.
 */

/** "2026-11-10" no fuso de São Paulo. */
export function dayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
}

/** Número do dia (dias desde 1970-01-01) a partir da chave "AAAA-MM-DD". */
export function dayNumber(key: string): number {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
}

/** Hash FNV-1a de 32 bits: estável, o mesmo em servidor e navegador. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Embaralha pelo dia: cada dia uma ordem, sempre a mesma no mesmo dia. */
export function shuffleForDay<T extends { id: string }>(list: T[], key: string): T[] {
  return [...list].sort((a, b) => hash(`${key}:${a.id}`) - hash(`${key}:${b.id}`) || a.id.localeCompare(b.id));
}

/** Ids dos `count` Bank Offers fixos do dia, em rodízio pela ordem de id. */
export function featuredForDay<T extends { id: string }>(offers: T[], key: string, count = 2): string[] {
  const ids = offers.map((o) => o.id).sort();
  if (ids.length <= count) return ids;
  const start = (dayNumber(key) * count) % ids.length;
  return Array.from({ length: count }, (_, i) => ids[(start + i) % ids.length]);
}
