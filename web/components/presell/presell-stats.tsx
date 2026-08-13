import Link from 'next/link';

export interface StatsData {
  range: string;
  clicksInRange: number;
  total: number;
  last24h: number;
  lastHour: number;
  activeGroup: string | null;
  series: Array<{ date: string; count: number }>;
  utm: Record<string, Array<{ label: string; count: number }>>;
  referrer: Array<{ label: string; count: number }>;
  device: Array<{ label: string; count: number }>;
  country: Array<{ label: string; count: number }>;
  recent: Array<{
    id: string;
    createdAt: string;
    device: string | null;
    utmSource: string | null;
    referrer: string | null;
  }>;
}

const RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'all', label: 'Todo' },
];

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-display text-[28px] font-bold leading-none text-[var(--text)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">{hint}</p>}
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <p className="text-[13px] font-semibold text-[var(--text)]">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-[var(--text-faint)]">Sin datos en el período.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate text-[var(--text-muted)]">{row.label}</span>
              <span className="shrink-0 font-semibold text-[var(--text)]">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Gráfico de barras em CSS — evita puxar biblioteca só por isto. */
function Chart({ series }: { series: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...series.map((point) => point.count));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <p className="text-[13px] font-semibold text-[var(--text)]">Clics a lo largo del tiempo</p>

      <div className="mt-4 flex h-[160px] items-end gap-1">
        {series.map((point) => (
          <div key={point.date} className="group relative flex-1">
            <div
              className="w-full rounded-t bg-[var(--brand)] transition-opacity hover:opacity-80"
              style={{ height: `${Math.max(2, (point.count / max) * 150)}px` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-[var(--text)] px-1.5 py-0.5 text-[10px] text-[var(--bg-elevated)] group-hover:block">
              {point.count}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex justify-between text-[10.5px] text-[var(--text-faint)]">
        <span>{series[0]?.date.slice(8)}/{series[0]?.date.slice(5, 7)}</span>
        <span>
          {series.at(-1)?.date.slice(8)}/{series.at(-1)?.date.slice(5, 7)}
        </span>
      </div>
    </div>
  );
}

export function PresellStats({
  stats,
  pageId,
  slug,
  range,
}: {
  stats: StatsData;
  pageId: string;
  slug: string;
  range: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-[18px] font-semibold text-[var(--text)]">
            Estadísticas
          </h3>
          <p className="text-[12px] text-[var(--text-faint)]">
            /p/{slug} · id {pageId.slice(0, 8)}…
          </p>
        </div>

        <div className="inline-flex gap-1 rounded-full bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-soft)]">
          {RANGES.map((item) => (
            <Link
              key={item.id}
              href={`?tab=stats&range=${item.id}`}
              scroll={false}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
                range === item.id
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Clics en el período"
          value={String(stats.clicksInRange)}
          hint={`Total: ${stats.total}`}
        />
        <Metric label="Últimas 24h" value={String(stats.last24h)} />
        <Metric label="Última hora" value={String(stats.lastHour)} />
        <Metric label="Grupo activo" value={stats.activeGroup ?? 'Ninguno'} />
      </div>

      <Chart series={stats.series} />

      <div>
        <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
          Origens (UTM)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Breakdown title="Origen (utm_source)" rows={stats.utm.source ?? []} />
          <Breakdown title="Medio (utm_medium)" rows={stats.utm.medium ?? []} />
          <Breakdown title="Campaña (utm_campaign)" rows={stats.utm.campaign ?? []} />
          <Breakdown title="Contenido (utm_content)" rows={stats.utm.content ?? []} />
          <Breakdown title="Término (utm_term)" rows={stats.utm.term ?? []} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
          Referrer, dispositivo y país
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Breakdown title="Referrer" rows={stats.referrer} />
          <Breakdown title="Dispositivo" rows={stats.device} />
          <Breakdown title="País" rows={stats.country} />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-[13px] font-semibold text-[var(--text)]">Últimos clics</p>
        {stats.recent.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-[var(--text-faint)]">
            Aún no hay clics registrados.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {stats.recent.map((click) => (
              <li key={click.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-[12.5px] text-[var(--text-muted)]">
                  {new Date(click.createdAt).toLocaleString('es-419', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="truncate text-[12px] text-[var(--text-faint)]">
                  {click.device ?? '—'}
                  {click.utmSource ? ` · ${click.utmSource}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
