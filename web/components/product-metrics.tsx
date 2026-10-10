import { formatCompact, formatPrice } from '@/lib/api';
import type { ProductMetrics as Metrics } from '@/lib/types';

/**
 * Painel "Datos de ventas" com o que a Kalodata entrega por produto nos
 * últimos 30 dias, mais o gráfico de tendência montado com o histórico
 * diário que o sync acumula (a API não devolve a série pronta).
 */
export function ProductMetrics({ metrics, currency, salesCount, commission }: {
  metrics: Metrics;
  currency: string;
  salesCount: number;
  commission?: number;
}) {
  const growth = metrics.revenueGrowth;
  const videoShare =
    metrics.videoRevenue != null && metrics.revenue > 0 ? Math.round((metrics.videoRevenue / metrics.revenue) * 100) : null;

  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Datos de ventas</h3>
        <p className="text-[11.5px] text-[var(--text-faint)]">Fuente: Kalodata · últimos 30 días</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Ingresos" value={formatPrice(metrics.revenue, currency)} strong />
          <Stat
            label="Crecimiento"
            value={growth == null ? '—' : `${growth > 0 ? '+' : ''}${growth.toFixed(1).replace('.', ',')}%`}
            tone={growth == null ? undefined : growth >= 0 ? 'up' : 'down'}
          />
          <Stat label="Unidades vendidas" value={formatCompact(salesCount)} />
          <Stat label="Precio medio" value={metrics.unitPrice != null ? formatPrice(metrics.unitPrice, currency) : '—'} />
          <Stat label="Comisión" value={commission != null ? `${commission}%` : '—'} />
          <Stat
            label="Creadores · videos"
            value={`${metrics.creatorCount != null ? formatCompact(metrics.creatorCount) : '—'} · ${metrics.videoCount != null ? formatCompact(metrics.videoCount) : '—'}`}
          />
        </div>

        <div className="rounded-2xl bg-[var(--bg-sunken)] p-3">
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Tendencia de ingresos</p>
          <Sparkline points={metrics.trend.map((p) => p.r)} />
          <p className="mt-1 text-[11px] text-[var(--text-faint)]">
            {metrics.trend.length < 3
              ? 'Se dibuja a medida que el catálogo se actualiza cada día.'
              : `${metrics.trend.length} días de historial`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[var(--text-muted)]">
        {videoShare != null && <span>{videoShare}% de los ingresos vienen de videos</span>}
        {metrics.liveRevenue != null && metrics.liveRevenue > 0 && (
          <span>Lives: {formatPrice(metrics.liveRevenue, currency)}</span>
        )}
        {metrics.reviewCount != null && <span>{formatCompact(metrics.reviewCount)} reseñas en TikTok Shop</span>}
        {metrics.launchDate && <span>En venta desde {formatDate(metrics.launchDate)}</span>}
      </div>
    </section>
  );
}

function Stat({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-[var(--money)]' : tone === 'down' ? 'text-[#d64545]' : 'text-[var(--text)]';
  return (
    <div className="rounded-2xl bg-[var(--bg-sunken)] px-3 py-2.5">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</p>
      <p className={`mt-0.5 font-display ${strong ? 'text-[20px]' : 'text-[16px]'} font-semibold leading-tight ${color}`}>{value}</p>
    </div>
  );
}

/** Linha simples em SVG; com um ponto só, desenha uma marca. */
function Sparkline({ points }: { points: number[] }) {
  const w = 180;
  const h = 56;
  if (!points.length) {
    return <div className="mt-2 h-14 rounded-xl border border-dashed border-[var(--border-strong)]" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => [i * step, h - 4 - ((p - min) / span) * (h - 8)] as const);
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  const rising = points[points.length - 1] >= points[0];
  const stroke = rising ? 'var(--money)' : '#d64545';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-14 w-full" role="img" aria-label="Tendencia de ingresos">
      {points.length > 1 && <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={points.length > 1 ? last[0] : w / 2} cy={points.length > 1 ? last[1] : h / 2} r="3.5" fill={stroke} />
    </svg>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-419', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
