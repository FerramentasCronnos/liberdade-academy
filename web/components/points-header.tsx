import Link from 'next/link';
import { formatPoints } from '@/lib/gamification';
import type { SessionUser } from '@/lib/session';
import { IconExternal, IconMedal, IconTrophy, IconWallet } from './icons';

export interface PointsSummary {
  balance: number;
  accumulated: number;
  redeemed: number;
}

/**
 * Cartão de nível + saldo, no topo de Missões e Recompensas.
 * `action` troca o botão principal conforme a tela (ir para recompensas ou
 * voltar para missões).
 */
export function PointsHeader({
  user,
  summary,
  action,
}: {
  user: SessionUser;
  summary: PointsSummary;
  action: { href: string; label: string };
}) {
  const { tier } = user;
  const goal = tier.next?.min ?? tier.current.min;
  const percent = Math.round(tier.progress * 100);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--text-faint)]">
            Saldo de pontos
          </p>
          <IconWallet className="h-[18px] w-[18px] text-[var(--text-faint)]" />
        </div>

        <p className="mt-0.5 font-display text-[34px] font-bold leading-tight text-[var(--text)]">
          {formatPoints(summary.balance)}
          <span className="ml-1 text-[15px] font-semibold text-[var(--text-muted)]">pts</span>
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[var(--bg-sunken)] px-3 py-2.5">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
              Acumulado
            </p>
            <p className="text-[16px] font-bold text-[var(--text)]">
              {formatPoints(summary.accumulated)}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--bg-sunken)] px-3 py-2.5">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
              Resgatado
            </p>
            <p className="text-[16px] font-bold text-[var(--text)]">
              {formatPoints(summary.redeemed)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href="#extrato"
            className="grid place-items-center rounded-2xl border border-[var(--border)] px-3 py-2.5 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
          >
            Extrato
          </a>
          <Link
            href={action.href}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--brand)] px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            {action.label}
            <IconExternal className="h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-faint)]">
          <IconMedal className="h-3.5 w-3.5" />
          Acumule com missões e troque por recompensas.
        </p>
      </div>
    </section>
  );
}
