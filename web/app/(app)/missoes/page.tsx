import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PointsHeader } from '@/components/points-header';
import { MissionCard } from '@/components/mission-card';
import { Tabs } from '@/components/tabs';
import { apiFetch, getCurrentUser, getToken } from '@/lib/session';
import {
  formatPoints,
  type Mission,
  type PointsEntry,
  type PointsSummary,
} from '@/lib/gamification';

export const metadata = { title: 'Misiones · Liberdade Academy' };

function MissionGrid({ missions, empty }: { missions: Mission[]; empty: string }) {
  if (missions.length === 0) {
    return (
      <div className="mt-4 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-14 text-center text-[13.5px] text-[var(--text-muted)]">
        {empty}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {missions.map((mission) => (
        <MissionCard key={mission.id} mission={mission} />
      ))}
    </div>
  );
}

export default async function MissionsPage() {
  if (!(await getToken())) redirect('/login');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [missionsData, entriesData, summaryData] = await Promise.all([
    apiFetch<{ missions: Mission[] }>('/missions').catch(() => null),
    apiFetch<{ entries: PointsEntry[] }>('/points/entries').catch(() => null),
    apiFetch<PointsSummary>('/points/summary').catch(() => null),
  ]);

  const missions = missionsData?.missions ?? [];
  const entries = entriesData?.entries ?? [];
  const summary = summaryData ?? { balance: user.points, accumulated: 0, redeemed: 0 };

  const available = missions.filter((m) => !m.locked && m.status !== 'pending');
  const pending = missions.filter((m) => m.status === 'pending');
  const done = missions.filter((m) => m.locked);

  return (
    <>
      <PageHeader title="Misiones" subtitle="Completa tareas y acumula puntos" />

      <div className="mx-auto max-w-[1240px] px-5 pb-12 pt-2 sm:px-8">
        <PointsHeader
          user={user}
          summary={summary}
          action={{ href: '/recompensas', label: 'Recompensas' }}
        />

        <div className="mt-8">
          <Tabs
            tabs={[
              {
                id: 'disponiveis',
                label: 'Disponibles',
                count: available.length,
                content: (
                  <MissionGrid
                    missions={available}
                    empty="Ninguna misión disponible ahora. Vuelve mañana — las repetibles se liberan cada 24 h."
                  />
                ),
              },
              {
                id: 'analise',
                label: 'En revisión',
                count: pending.length,
                content: (
                  <MissionGrid
                    missions={pending}
                    empty="Ningún comprobante esperando revisión."
                  />
                ),
              },
              {
                id: 'concluidas',
                label: 'Completadas',
                count: done.length,
                content: (
                  <MissionGrid missions={done} empty="Aún no completaste ninguna misión." />
                ),
              },
            ]}
          />
        </div>

        <h2
          id="extrato"
          className="mt-10 scroll-mt-6 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]"
        >
          Historial de puntos
        </h2>

        <div className="mt-3 rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-[var(--text-muted)]">
              Aún no hay movimientos. Completa una misión para empezar.
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
                      {new Date(entry.createdAt).toLocaleDateString('es-419', {
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
