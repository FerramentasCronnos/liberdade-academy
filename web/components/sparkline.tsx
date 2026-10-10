/**
 * Linha simples em SVG para tendências (receita dos últimos 30 dias etc.).
 * Sem hooks: serve tanto em server components quanto em client components.
 * Verde quando o último ponto está acima do primeiro, vermelho caso contrário.
 */
export function Sparkline({
  points,
  width = 160,
  height = 48,
  stroke,
  className,
  label = 'Tendencia',
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
  label?: string;
}) {
  if (!points.length) {
    return (
      <div
        className={`rounded-xl border border-dashed border-[var(--border-strong)] ${className ?? ''}`}
        style={{ width, height }}
        aria-hidden
      />
    );
  }

  const pad = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map(
    (p, i) => [pad + i * step, height - pad - ((p - min) / span) * (height - pad * 2)] as const,
  );
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  const rising = points[points.length - 1] >= points[0];
  const color = stroke ?? (rising ? 'var(--money)' : '#d64545');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={label}
    >
      {points.length > 1 && (
        <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      )}
      <circle
        cx={points.length > 1 ? last[0] : width / 2}
        cy={points.length > 1 ? last[1] : height / 2}
        r="3"
        fill={color}
      />
    </svg>
  );
}
