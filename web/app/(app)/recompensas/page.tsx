import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PointsHeader } from '@/components/points-header';
import { RewardCard } from '@/components/reward-card';
import { apiFetch, getCurrentUser, getToken } from '@/lib/session';
import {
  REDEMPTION_STATUS,
  formatPoints,
  type Redemption,
  type Reward,
} from '@/lib/gamification';

export const metadata = { title: 'Recompensas · Liberdade Academy' };

export default async function RewardsPage() {
  if (!(await getToken())) redirect('/login');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [rewardsData, redemptionsData] = await Promise.all([
    apiFetch<{ balance: number; rewards: Reward[] }>('/rewards').catch(() => null),
    apiFetch<{ redemptions: Redemption[] }>('/rewards/redemptions').catch(() => null),
  ]);

  const rewards = rewardsData?.rewards ?? [];
  const redemptions = redemptionsData?.redemptions ?? [];

  return (
    <>
      <PageHeader title="Recompensas" subtitle="Troque seus pontos por prêmios" />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <PointsHeader user={user} />

        {redemptions.length > 0 && (
          <>
            <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
              Meus resgates
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
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
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
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
          </>
        )}

        <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
          Catálogo de prêmios
        </h2>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rewards.map((reward) => (
            <RewardCard key={reward.id} reward={reward} />
          ))}
        </div>

        {rewards.length === 0 && (
          <div className="mt-3 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center text-[13.5px] text-[var(--text-muted)]">
            Nenhuma recompensa cadastrada.
          </div>
        )}
      </div>
    </>
  );
}
