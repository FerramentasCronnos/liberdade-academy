import { formatPoints } from '@/lib/gamification';
import type { SessionUser } from '@/lib/session';
import { IconMedal, IconTrophy } from './icons';

/** Cartão de saldo e progressão de nível, no topo de Missões e Recompensas. */
export function PointsHeader({ user }: { user: SessionUser }) {
  const { tier } = user;
  const goal = tier.next?.min ?? tier.current.min;
  const percent = Math.round(tier.progress * 100);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="rounded-[24px] bg-[image:var(--sidebar-bg)] p-6 text-white shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/12">
            <IconTrophy className="h-7 w-7 text-[var(--color-gold-400)]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/55">
              Nível atual
            </p>
            <p className="font-display text-[28px] font-semibold leading-tight">
              {tier.current.label}
            </p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[var(--color-gold-400)] transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-2 flex justify-between text-[12px] text-white/65">
          <span>{tier.current.label}</span>
          <span>
            {tier.next
              ? `${formatPoints(user.points)} / ${formatPoints(goal)} para ${tier.next.label}`
              : 'Nível máximo alcançado'}
          </span>
        </p>
      </div>

      <div className="rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--text-faint)]">
          Saldo de pontos
        </p>
        <p className="mt-1 inline-flex items-center gap-2 font-display text-[34px] font-bold leading-tight text-[var(--text)]">
          <IconMedal className="h-7 w-7 text-[var(--brand)]" />
          {formatPoints(user.points)}
        </p>
        <p className="text-[13px] text-[var(--text-muted)]">
          Acumule com missões e troque por recompensas.
        </p>
      </div>
    </section>
  );
}
