import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PointsHeader } from '@/components/points-header';
import { RewardCard } from '@/components/reward-card';
import { Tabs } from '@/components/tabs';
import { getCurrentUser, getUserId } from '@/lib/session';
import { listRedemptions, listRewards, pointsSummary } from '@/lib/queries';
import {
  REDEMPTION_STATUS,
  formatPoints,
  type PointsSummary,
  type Redemption,
  type Reward,
} from '@/lib/gamification';

export const metadata = { title: 'Recompensas · Liberdade Academy' };

function RewardGrid({ rewards }: { rewards: Reward[] }) {
  if (rewards.length === 0) {
    return (
      <div className="mt-4 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-14 text-center text-[13.5px] text-[var(--text-muted)]">
        Ninguna recompensa registrada.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rewards.map((reward) => (
        <RewardCard key={reward.id} reward={reward} />
      ))}
    </div>
  );
}

function RedemptionList({ redemptions }: { redemptions: Redemption[] }) {
  if (redemptions.length === 0) {
    return (
      <div className="mt-4 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-14 text-center text-[13.5px] text-[var(--text-muted)]">
        Aún no canjeaste nada.
      </div>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
      {redemptions.map((item) => {
        const status = REDEMPTION_STATUS[item.status] ?? {
          label: item.status,
          className: 'bg-[var(--bg-sunken)] text-[var(--text-muted)]',
        };
        return (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[var(--text)]">
                {item.reward.title}
              </p>
              <p className="text-[12px] text-[var(--text-faint)]">
                {formatPoints(item.costPoints)} pts ·{' '}
                {new Date(item.createdAt).toLocaleDateString('es-419')}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${status.className}`}
            >
              {status.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function RewardsPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [rewards, redemptions, summary] = await Promise.all([
    listRewards(userId).catch(() => [] as Reward[]),
    listRedemptions(userId).catch(() => [] as Redemption[]),
    pointsSummary(userId).catch(
      () => ({ balance: user.points, accumulated: 0, redeemed: 0 }) as PointsSummary,
    ),
  ]);

  return (
    <>
      <PageHeader title="Recompensas" subtitle="Cambia tus puntos por premios" />

      <div className="mx-auto max-w-[1240px] px-5 pb-12 pt-2 sm:px-8">
        <PointsHeader
          user={user}
          summary={summary}
          action={{ href: '/missoes', label: 'Misiones' }}
        />

        <div className="mt-8">
          <Tabs
            tabs={[
              {
                id: 'catalogo',
                label: 'Recompensas',
                count: rewards.length,
                content: <RewardGrid rewards={rewards} />,
              },
              {
                id: 'resgates',
                label: 'Mis canjes',
                count: redemptions.length,
                content: <RedemptionList redemptions={redemptions} />,
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
