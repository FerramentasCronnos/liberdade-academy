import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PointsHeader } from '@/components/points-header';
import { MissionCard } from '@/components/mission-card';
import { apiFetch, getCurrentUser, getToken } from '@/lib/session';
import { formatPoints, type Mission, type PointsEntry } from '@/lib/gamification';

export const metadata = { title: 'Missões · Liberdade Academy' };

export default async function MissionsPage() {
  if (!(await getToken())) redirect('/login');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [missionsData, entriesData] = await Promise.all([
    apiFetch<{ missions: Mission[] }>('/missions').catch(() => null),
    apiFetch<{ entries: PointsEntry[] }>('/points/entries').catch(() => null),
  ]);

  const missions = missionsData?.missions ?? [];
  const entries = entriesData?.entries ?? [];

  const available = missions.filter((m) => !m.locked && m.status !== 'pending');
  const pending = missions.filter((m) => m.status === 'pending');
  const done = missions.filter((m) => m.locked);

  return (
    <>
      <PageHeader title="Missões" subtitle="Complete tarefas e acumule pontos" />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <PointsHeader user={user} />

        {pending.length > 0 && (
          <>
            <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
              Em análise ({pending.length})
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pending.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          </>
        )}

        <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
          Disponíveis ({available.length})
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {available.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>

        {done.length > 0 && (
          <>
            <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Concluídas ({done.length})
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {done.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          </>
        )}

        <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
          Extrato
        </h2>
        <div className="mt-3 rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-[var(--text-muted)]">
              Nenhuma movimentação ainda. Complete uma missão para começar.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[var(--text)]">
                      {entry.reason}
                    </p>
                    <p className="text-[12px] text-[var(--text-faint)]">
                      {new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[14px] font-bold ${
                      entry.points >= 0 ? 'text-[var(--money)]' : 'text-red-500'
                    }`}
                  >
                    {entry.points >= 0 ? '+' : ''}
                    {formatPoints(entry.points)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
