/**
 * Arte da recompensa quando ainda não há foto real.
 *
 * SVG próprio em vez de foto de banco de imagens: metade dos prêmios é
 * material de marca da própria academia (copo, moletom, mochila), e uma foto
 * genérica mostraria um produto que não é o deles. A escala de cor sobe junto
 * com o custo, então o valor do prêmio se lê antes de bater o olho no número.
 */

const TIERS: Array<[number, [string, string]]> = [
  [5000, ['#7b6ce8', '#4b3fb0']],
  [10000, ['#3aa8a0', '#1f7d78']],
  [30000, ['#e3b352', '#c07f1f']],
  [Infinity, ['#e2749b', '#8e2f56']],
];

function gradientFor(cost: number) {
  return (TIERS.find(([max]) => cost < max) ?? TIERS[TIERS.length - 1])[1];
}

const base = {
  fill: 'none',
  stroke: '#fff',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  opacity: 0.95,
};

const SHAPES: Record<string, React.ReactElement> = {
  'copo-termico': (
    <g {...base}>
      <path d="M20 14h16l-2 30a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3Z" />
      <path d="M22 22h12M31 8v6" />
    </g>
  ),
  moletom: (
    <g {...base}>
      <path d="M18 20l10-4h8l10 4-3 8-4-1v20H25V27l-4 1Z" />
      <path d="M28 16a4 4 0 0 0 8 0" />
    </g>
  ),
  mochila: (
    <g {...base}>
      <rect x="18" y="18" width="28" height="30" rx="6" />
      <path d="M25 18v-4a7 7 0 0 1 14 0v4M25 32h14" />
    </g>
  ),
  'kit-gravacao': (
    <g {...base}>
      <rect x="17" y="16" width="20" height="15" rx="3" />
      <path d="M32 24l12-6v18l-12-6M27 31v17M20 50l7-6 7 6" />
    </g>
  ),
  'kit-livros': (
    <g {...base}>
      <path d="M16 18h14v28H16zM32 20h14v26H32z" />
      <path d="M20 26h6M36 28h6" />
    </g>
  ),
  kindle: (
    <g {...base}>
      <rect x="20" y="12" width="24" height="34" rx="3" />
      <path d="M25 20h14M25 26h14M25 32h9" />
    </g>
  ),
  'capcut-pro': (
    <g {...base}>
      <rect x="15" y="20" width="34" height="22" rx="4" />
      <path d="M28 27l9 4-9 4Z" />
    </g>
  ),
  microfone: (
    <g {...base}>
      <rect x="27" y="12" width="10" height="20" rx="5" />
      <path d="M21 28a11 11 0 0 0 22 0M32 39v9M26 48h12" />
    </g>
  ),
  'box-surpresa': (
    <g {...base}>
      <rect x="16" y="24" width="32" height="9" rx="2" />
      <path d="M19 33v14a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V33M32 24v25" />
      <path d="M32 24s-3-9-8-9a4 4 0 0 0 0 9ZM32 24s3-9 8-9a4 4 0 0 1 0 9Z" />
    </g>
  ),
  'kit-escritorio': (
    <g {...base}>
      <rect x="15" y="20" width="20" height="14" rx="2" />
      <rect x="39" y="26" width="10" height="16" rx="2" />
      <path d="M18 42h16M22 34v8" />
    </g>
  ),
  cadeira: (
    <g {...base}>
      <path d="M23 14h18v18H23zM21 34h22M32 34v8M24 50l8-8 8 8" />
    </g>
  ),
  'chatgpt-plus': (
    <g {...base}>
      <circle cx="32" cy="30" r="13" />
      <path d="M32 22v16M24 30h16" />
    </g>
  ),
  airpods: (
    <g {...base}>
      <path d="M24 18a5 5 0 0 1 5 5v10a5 5 0 0 1-10 0V23a5 5 0 0 1 5-5ZM40 18a5 5 0 0 1 5 5v10a5 5 0 0 1-10 0V23a5 5 0 0 1 5-5Z" />
      <path d="M24 38v8M40 38v8" />
    </g>
  ),
  iphone: (
    <g {...base}>
      <rect x="23" y="10" width="18" height="38" rx="4" />
      <path d="M29 15h6M32 43h.01" />
    </g>
  ),
  ipad: (
    <g {...base}>
      <rect x="19" y="12" width="26" height="36" rx="3" />
      <path d="M32 43h.01" />
    </g>
  ),
  macbook: (
    <g {...base}>
      <rect x="18" y="16" width="28" height="19" rx="2" />
      <path d="M13 41h38l-3 5H16Z" />
    </g>
  ),
  consultoria: (
    <g {...base}>
      <circle cx="32" cy="22" r="7" />
      <path d="M19 46a13 13 0 0 1 26 0" />
    </g>
  ),
};

const FALLBACK = (
  <g {...base}>
    <path d="m32 12 5.6 11.6L50 25.4l-9 8.8 2.2 12.6L32 40.9 20.8 46.8 23 34.2l-9-8.8 12.4-1.8Z" />
  </g>
);

export function RewardArt({
  slug,
  cost = 0,
  className = '',
}: {
  slug: string;
  cost?: number;
  className?: string;
}) {
  const [from, to] = gradientFor(cost);
  const id = `reward-${slug}`;

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id})`} />
      <circle cx="55" cy="9" r="15" fill="#fff" opacity=".08" />
      {SHAPES[slug] ?? FALLBACK}
    </svg>
  );
}
