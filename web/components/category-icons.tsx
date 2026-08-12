import type { SVGProps } from 'react';
import type { CategoryId } from '@/lib/types';

/**
 * Ícones das categorias em traço.
 *
 * Emoji renderiza diferente em cada sistema (Apple, Windows, Android desenham
 * outro boneco) e não aceita a cor da marca. Traço resolve os dois.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

type P = SVGProps<SVGSVGElement>;

const Sparkle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6-5.5-1.7L10.3 9Z" />
    <path d="M18.5 4v3M20 5.5h-3" />
  </svg>
);

// batom
const Beauty = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9.5 10V6.2a2.7 2.7 0 0 1 1.5-2.4l2.4-1.2a1 1 0 0 1 1.5.9V10" />
    <rect x="8.5" y="10" width="7" height="5" rx="1.4" />
    <path d="M9.2 15h5.6v5.6a1.4 1.4 0 0 1-1.4 1.4h-2.8a1.4 1.4 0 0 1-1.4-1.4Z" />
  </svg>
);

// folha + gota
const Health = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 4c0 7.2-4 11-9 11a6.5 6.5 0 0 1-2.6-.5C10 9 14.6 5.4 20 4Z" />
    <path d="M4 21c0-4.2 1.6-7.4 4.4-9.5" />
  </svg>
);

// halter
const Fitness = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12" />
  </svg>
);

// cabide / vestido
const Fashion = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3a2 2 0 0 0-.7 3.9V9" />
    <path d="M11.3 9 4 14.6c-.9.7-.4 2.1.7 2.1h14.6c1.1 0 1.6-1.4.7-2.1L12.7 9Z" />
  </svg>
);

// casa + panela
const Home = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.8V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8" />
    <path d="M9.5 21v-5.5h5V21" />
  </svg>
);

// fone
const Tech = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="2.5" y="13.5" width="4.5" height="7" rx="2" />
    <rect x="17" y="13.5" width="4.5" height="7" rx="2" />
  </svg>
);

// caixa
const Other = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8.5 12 4l9 4.5-9 4.5Z" />
    <path d="M3 8.5V16l9 4.5V13M21 8.5V16l-9 4.5" />
  </svg>
);

// download
const Digital = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5v11M8 11l4 3.5 4-3.5" />
    <path d="M4.5 17.5v1.8a1.2 1.2 0 0 0 1.2 1.2h12.6a1.2 1.2 0 0 0 1.2-1.2v-1.8" />
  </svg>
);

export const CATEGORY_ICONS: Record<CategoryId, (p: P) => React.ReactElement> = {
  todos: Sparkle,
  beleza: Beauty,
  saude: Health,
  fitness: Fitness,
  moda: Fashion,
  casa: Home,
  tech: Tech,
  fisico: Other,
  digital: Digital,
};
