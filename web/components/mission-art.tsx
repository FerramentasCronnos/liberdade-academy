/**
 * Arte do topo do card de missão.
 *
 * São ilustrações próprias em SVG, com gradiente por categoria — não copiei as
 * do concorrente porque são material licenciado deles. Vetor também escala em
 * qualquer tela e acompanha a paleta da marca sem precisar de asset por card.
 */

const GRADIENTS: Record<string, [string, string]> = {
  outras: ['#6f5fe0', '#4b3fb0'],
  vendas: ['#e3b352', '#c07f1f'],
  marketplaces: ['#3aa8a0', '#1f7d78'],
  curso: ['#5b8def', '#3b5fd0'],
  indicacoes: ['#e2749b', '#c04a77'],
};

type ArtProps = { className?: string };

/** Balões de conversa — comunidade. */
function Chat() {
  return (
    <g>
      <rect x="14" y="18" width="52" height="34" rx="10" fill="#fff" opacity=".92" />
      <path d="M28 52l-2 10 12-10Z" fill="#fff" opacity=".92" />
      <circle cx="30" cy="35" r="3.4" fill="currentColor" opacity=".55" />
      <circle cx="40" cy="35" r="3.4" fill="currentColor" opacity=".55" />
      <circle cx="50" cy="35" r="3.4" fill="currentColor" opacity=".55" />
      <rect x="56" y="40" width="44" height="30" rx="9" fill="#fff" opacity=".62" />
      <path d="M86 70l3 9-11-9Z" fill="#fff" opacity=".62" />
    </g>
  );
}

/** Lápis sobre folha — publicar / roteiro. */
function Write() {
  return (
    <g>
      <rect x="22" y="14" width="52" height="62" rx="8" fill="#fff" opacity=".92" />
      <path d="M32 30h32M32 41h32M32 52h20" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" opacity=".45" />
      <path
        d="M74 56 92 38l8 8-18 18-10 2Z"
        fill="#fff"
        opacity=".95"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Troféu — conquista. */
function Trophy() {
  return (
    <g>
      <path d="M38 16h34v18a17 17 0 1 1-34 0Z" fill="#fff" opacity=".95" />
      <path
        d="M38 20H26v5a13 13 0 0 0 12 13M72 20h12v5a13 13 0 0 1-12 13"
        stroke="#fff"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M55 51v13M42 70h26" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="m55 26 3 6 6.5.9-4.7 4.6 1.1 6.5L55 41l-5.9 3 1.1-6.5-4.7-4.6 6.5-.9Z" fill="currentColor" opacity=".5" />
    </g>
  );
}

/** Carteira com moedas — comissões. */
function Money() {
  return (
    <g>
      <rect x="16" y="26" width="72" height="46" rx="10" fill="#fff" opacity=".92" />
      <path d="M16 38h72" stroke="currentColor" strokeWidth="3" opacity=".3" />
      <circle cx="70" cy="52" r="7" fill="currentColor" opacity=".5" />
      <circle cx="86" cy="24" r="13" fill="#fff" opacity=".95" />
      <path d="M86 18v12M83 21.5h6M83 26.5h6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity=".6" />
    </g>
  );
}

/** Sacola — primeira venda. */
function Bag() {
  return (
    <g>
      <path d="M26 32h52l6 44H20Z" fill="#fff" opacity=".92" />
      <path
        d="M40 36V26a12 12 0 0 1 24 0v10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity=".55"
      />
      <path d="m52 50 3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1Z" fill="currentColor" opacity=".45" />
    </g>
  );
}

/** Peças de encaixe — conectar contas. */
function Puzzle() {
  return (
    <g>
      <path
        d="M20 24h26v8a6 6 0 1 0 12 0v-8h26v26h-8a6 6 0 1 0 0 12h8v18H20V62h8a6 6 0 1 0 0-12h-8Z"
        fill="#fff"
        opacity=".92"
      />
      <circle cx="70" cy="42" r="5" fill="currentColor" opacity=".35" />
    </g>
  );
}

/** Play — curso. */
function Play() {
  return (
    <g>
      <rect x="18" y="20" width="70" height="50" rx="10" fill="#fff" opacity=".92" />
      <path d="M46 34l20 11-20 11Z" fill="currentColor" opacity=".55" />
      <path d="M36 78h34" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
    </g>
  );
}

/** Duas pessoas — indicação. */
function Friends() {
  return (
    <g>
      <circle cx="38" cy="30" r="12" fill="#fff" opacity=".92" />
      <path d="M18 72a20 20 0 0 1 40 0Z" fill="#fff" opacity=".92" />
      <circle cx="72" cy="36" r="10" fill="#fff" opacity=".62" />
      <path d="M56 72a16 16 0 0 1 32 0Z" fill="#fff" opacity=".62" />
    </g>
  );
}

const BY_SLUG: Record<string, () => React.ReactElement> = {
  'engajar-comunidade': Chat,
  'postar-comunidade': Write,
  'completar-perfil': Friends,
  'primeira-venda': Bag,
  'primeiros-50': Money,
  'primeiros-500': Money,
  'primeiros-1000': Money,
  'primeiros-5000': Trophy,
  'finalizar-curso': Play,
  'indicou-e-comprou': Friends,
  recomende: Trophy,
};

const BY_CATEGORY: Record<string, () => React.ReactElement> = {
  outras: Chat,
  vendas: Money,
  marketplaces: Puzzle,
  curso: Play,
  indicacoes: Friends,
};

export function MissionArt({
  slug,
  category,
  className = '',
}: ArtProps & { slug: string; category: string }) {
  const Shape = BY_SLUG[slug] ?? BY_CATEGORY[category] ?? Chat;
  const [from, to] = GRADIENTS[category] ?? GRADIENTS.outras;
  const gradientId = `mission-${slug}`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 110 90" className="h-full w-full" style={{ color: to }} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <rect width="110" height="90" fill={`url(#${gradientId})`} />
        <circle cx="96" cy="12" r="26" fill="#fff" opacity=".08" />
        <circle cx="10" cy="80" r="20" fill="#fff" opacity=".07" />
        <Shape />
      </svg>
    </div>
  );
}
