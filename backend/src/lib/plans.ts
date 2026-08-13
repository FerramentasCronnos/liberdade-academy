/**
 * Planos do membro.
 *
 * Hoje o anual de R$ 147 libera tudo — não há recurso bloqueado para ele.
 * Este módulo existe para que, quando houver diferença entre os planos, ela
 * fique num lugar só em vez de espalhada em `if` pelas rotas.
 */

export const PLANS = {
  free: { id: 'free', label: 'Gratuito', rank: 0 },
  mensal_97: { id: 'mensal_97', label: 'Mensal R$ 97', rank: 1 },
  anual_147: { id: 'anual_147', label: 'Anual R$ 147', rank: 2 },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

/** Plano vigente: vencido volta para free. */
export function effectivePlan(plan: string, expiresAt: Date | null): PlanId {
  if (!isPlanId(plan)) return 'free';
  if (plan !== 'free' && expiresAt && expiresAt.getTime() < Date.now()) return 'free';
  return plan;
}

export function planInfo(plan: string, expiresAt: Date | null) {
  const id = effectivePlan(plan, expiresAt);
  return {
    id,
    label: PLANS[id].label,
    rank: PLANS[id].rank,
    expiresAt: expiresAt?.toISOString() ?? null,
    /** Enquanto nada é bloqueado, todo plano pago tem acesso completo. */
    fullAccess: PLANS[id].rank >= 1,
  };
}
