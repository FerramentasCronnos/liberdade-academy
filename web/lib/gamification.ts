export type MissionKind = 'automatic' | 'proof';
export type MissionStatus = 'available' | 'pending' | 'approved' | 'rejected';

export interface Mission {
  id: string;
  slug: string;
  title: string;
  description: string;
  points: number;
  category: string;
  kind: MissionKind;
  repeatable: boolean;
  status: MissionStatus;
  /** true = concluída e ainda não liberada de novo. */
  locked: boolean;
  availableAt: string | null;
  completedAt: string | null;
}

export interface Reward {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  costPoints: number;
  stock: number | null;
  soldOut: boolean;
  affordable: boolean;
}

export interface Redemption {
  id: string;
  status: string;
  costPoints: number;
  createdAt: string;
  reward: { title: string; image?: string };
}

export interface PointsEntry {
  id: string;
  points: number;
  reason: string;
  createdAt: string;
}

export const MISSION_CATEGORIES: Record<string, string> = {
  outras: 'Outras',
  vendas: 'Vendas',
  marketplaces: 'Marketplaces',
  curso: 'Curso',
  indicacoes: 'Indicações',
};

export const REDEMPTION_STATUS: Record<string, { label: string; className: string }> = {
  requested: {
    label: 'Solicitado',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-[var(--violet-soft)] text-[var(--brand)]',
  },
  delivered: {
    label: 'Entregue',
    className: 'bg-[var(--money-soft)] text-[var(--money)]',
  },
  rejected: {
    label: 'Recusado',
    className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
};

export function formatPoints(value: number) {
  return value.toLocaleString('pt-BR');
}

export interface PointsSummary {
  balance: number;
  accumulated: number;
  redeemed: number;
}
