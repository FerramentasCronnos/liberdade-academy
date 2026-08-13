import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { apiFetch, getCurrentUser, getToken } from '@/lib/session';
import { avatarColor, initials } from '@/lib/community';

export const metadata = { title: 'Ranking · Liberdade Academy' };

interface RankingUser {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  rank: number;
  salesCount: number;
}

const PODIUM_STYLE = [
  { ring: 'ring-[var(--color-gold-400)]', label: 'bg-[var(--color-gold-400)] text-[var(--color-ink-900)]', size: 'h-24 w-24' },
  { ring: 'ring-slate-300', label: 'bg-slate-300 text-slate-800', size: 'h-20 w-20' },
  { ring: 'ring-amber-600', label: 'bg-amber-600 text-white', size: 'h-20 w-20' },
];

export default async function RankingPage() {
  if (!(await getToken())) redirect('/login');

  const [data, me] = await Promise.all([
    apiFetch<{ ranking: RankingUser[] }>('/ranking').catch(() => null),
    getCurrentUser(),
  ]);

  const ranking = data?.ranking ?? [];
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <>
      <PageHeader title="Ranking" subtitle="Clasificación de los miembros por XP y ventas" />

      <div className="mx-auto max-w-[820px] px-5 pb-12 pt-2 sm:px-8">
        {podium.length > 0 && (
          <div className="flex items-end justify-center gap-4 rounded-[24px] bg-[image:var(--sidebar-bg)] px-4 py-8 text-white shadow-[var(--shadow-lift)] sm:gap-8">
            {/* 2º à esquerda, 1º ao centro, 3º à direita */}
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((user) => {
              const place = podium.indexOf(user);
              const style = PODIUM_STYLE[place];
              const isFirst = place === 0;

              return (
                <div
                  key={user.id}
                  className={`flex flex-col items-center ${isFirst ? 'order-none -translate-y-3' : ''}`}
                >
                  <span
                    className={`grid ${style.size} place-items-center rounded-full text-[20px] font-bold text-white ring-4 ${style.ring}`}
                    style={{ backgroundColor: avatarColor(user.name) }}
                  >
                    {initials(user.name)}
                  </span>
                  <span
                    className={`-mt-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.label}`}
                  >
                    {user.rank}º
                  </span>
                  <p className="mt-2 max-w-[110px] truncate text-center text-[13.5px] font-semibold">
                    {user.name}
                  </p>
                  <p className="text-[12px] text-white/60">
                    {user.xp.toLocaleString('es-419')} XP
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {rest.map((user) => {
            const isMe = me?.id === user.id;
            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 rounded-[18px] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-soft)] ${
                  isMe ? 'ring-2 ring-[var(--brand)]' : ''
                }`}
              >
                <span className="w-7 shrink-0 text-center text-[14px] font-bold text-[var(--text-faint)]">
                  {user.rank}
                </span>
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
                  style={{ backgroundColor: avatarColor(user.name) }}
                >
                  {initials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[14px] font-semibold text-[var(--text)]">
                    {user.name}
                    {isMe && (
                      <span className="rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                        Tú
                      </span>
                    )}
                  </p>
                  <p className="text-[12.5px] text-[var(--text-muted)]">
                    Nível {user.level} · {user.salesCount} vendas
                  </p>
                </div>
                <span className="shrink-0 text-[13.5px] font-bold text-[var(--brand)]">
                  {user.xp.toLocaleString('es-419')} XP
                </span>
              </div>
            );
          })}
        </div>

        {ranking.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center">
            <p className="font-display text-lg font-semibold text-[var(--text)]">
              Ranking vacío
            </p>
            <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
              Cuando los miembros empiecen a puntuar, aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
