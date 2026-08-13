/**
 * Níveis de gamificação por pontos.
 * O nome do nível é o que aparece no selo do perfil ("Normal", "Silver"…).
 */

export const TIERS = [
  { id: 'normal', label: 'Normal', min: 0 },
  { id: 'silver', label: 'Silver', min: 1000 },
  { id: 'gold', label: 'Gold', min: 5000 },
  { id: 'platinum', label: 'Platinum', min: 15000 },
  { id: 'diamond', label: 'Diamond', min: 50000 },
] as const;

export type Tier = (typeof TIERS)[number];

export function tierFor(points: number) {
  const current = [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
  const next = TIERS.find((t) => t.min > points) ?? null;

  return {
    current: { id: current.id, label: current.label, min: current.min },
    next: next ? { id: next.id, label: next.label, min: next.min } : null,
    /** 0–1 de progresso até o próximo nível; 1 quando já está no topo. */
    progress: next ? Math.min(1, (points - current.min) / (next.min - current.min)) : 1,
  };
}
