export type PageKind = 'presell' | 'bio';
export type PresellTemplate = 'countdown' | 'minimalista' | 'prova_social';

export interface Benefit {
  icon: string;
  label: string;
}

export interface PresellConfig {
  titleColor: string;
  subtitleColor: string;
  buttonText: string;
  footerText: string;

  primaryColor: string;
  bgColor: string;
  bgMode: 'solido' | 'degrade';
  bgColor2: string;
  /** Vazio = derivado do fundo, levemente escurecido. */
  photoBorder: string;

  benefits: Benefit[];

  countdown: {
    enabled: boolean;
    duration: number;
    message: string;
    messageColor: string;
    expiredMessage: string;
    expiredColor: string;
  };

  scarcity: {
    enabled: boolean;
    initial: number;
    min: number;
    total: number;
  };

  /** Prova social: depoimento e aviso do template homônimo. */
  proof: {
    highlight: string;
    note: string;
    testimonial: string;
  };

  tracking: {
    pixelId: string;
    capiToken: string;
    testEventCode: string;
  };
}

export interface BioLink {
  label: string;
  url: string;
  bg: string;
  fg: string;
}

export interface BioConfig {
  bgColor: string;
  banner: boolean;
  links: BioLink[];
}

export interface LandingPage {
  id: string;
  kind: PageKind;
  slug: string;
  template: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  config: Record<string, unknown>;
  rotationAuto: boolean;
  defaultClickLimit: number | null;
  published: boolean;
  views: number;
  updatedAt: string;
  groups?: PageGroup[];
}

export interface PageGroup {
  id: string;
  name: string;
  inviteUrl: string;
  clickLimit: number | null;
  clicks: number;
  active: boolean;
}

export const PRESELL_TEMPLATES: Array<{
  id: PresellTemplate;
  label: string;
  description: string;
}> = [
  { id: 'countdown', label: 'Countdown', description: 'Cuenta regresiva y barra de cupos' },
  { id: 'minimalista', label: 'Minimalista', description: 'Solo lo esencial, sin distracción' },
  { id: 'prova_social', label: 'Prova Social', description: 'Testimonio y escasez destacados' },
];

export const BENEFIT_ICONS = ['🔥', '⚡', '🎁', '💸', '⭐', '✅', '🛒', '📦', '💎', '🏷️'];

export const DEFAULT_PRESELL: PresellConfig = {
  titleColor: '#111111',
  subtitleColor: '#666666',
  buttonText: 'ENTRAR AL GRUPO GRATIS',
  footerText: 'Es gratis y puedes salir cuando quieras',

  primaryColor: '#22c55e',
  bgColor: '#ffffff',
  bgMode: 'solido',
  bgColor2: '#f1f5f9',
  photoBorder: '',

  benefits: [
    { icon: '🔥', label: 'Los productos más virales de internet' },
    { icon: '⚡', label: 'Ofertas relámpago de primera mano' },
    { icon: '🎁', label: 'Hallazgos con hasta 80% OFF' },
  ],

  countdown: {
    enabled: true,
    duration: 60,
    message: '⏰ La invitación para ENTRAR AL GRUPO tiene tiempo limitado y termina en:',
    messageColor: '#7f3d4c',
    expiredMessage:
      'Se te acabó el tiempo, pero quien me conoce sabe que creo en las segundas oportunidades: haz clic en el enlace, entra al grupo, ¡hay una sorpresa esperándote!',
    expiredColor: '#7f3d4c',
  },

  scarcity: { enabled: true, initial: 12, min: 1, total: 50 },

  proof: {
    highlight: '👇 Haz clic para entrar al grupo VIP',
    note: 'Cupos limitados • Solo para promociones seleccionadas',
    testimonial:
      '"Entré al grupo ayer y ya compré unos audífonos que estaban en $299 por $89. ¡Vale muchísimo!"',
  },

  tracking: { pixelId: '', capiToken: '', testEventCode: '' },
};

export const DEFAULT_BIO: BioConfig = {
  bgColor: '#ffffff',
  banner: false,
  links: [],
};

export const BIO_MODELS: Array<{
  id: string;
  label: string;
  description: string;
  config: BioConfig;
}> = [
  {
    id: 'marketplaces',
    label: 'Marketplaces',
    description: 'Enlaces de las principales tiendas listos',
    config: {
      bgColor: '#ffffff',
      banner: false,
      links: [
        { label: 'WhatsApp', url: '', bg: '#22c55e', fg: '#ffffff' },
        { label: 'Amazon', url: '', bg: '#60a5fa', fg: '#ffffff' },
        { label: 'Shopee', url: '', bg: '#f97316', fg: '#ffffff' },
        { label: 'Mercado Libre', url: '', bg: '#fbd34d', fg: '#ffffff' },
        { label: 'Instagram', url: '', bg: '#ec4899', fg: '#ffffff' },
      ],
    },
  },
  {
    id: 'branco',
    label: 'En blanco',
    description: 'Empezar de cero, sin enlaces',
    config: { bgColor: '#ffffff', banner: false, links: [] },
  },
  {
    id: 'escuro',
    label: 'Minimalista oscuro',
    description: 'Fondo oscuro, estilo sobrio',
    config: {
      bgColor: '#111827',
      banner: false,
      links: [
        { label: 'Meu site', url: '', bg: 'transparent', fg: '#ffffff' },
        { label: 'Instagram', url: '', bg: 'transparent', fg: '#ffffff' },
        { label: 'Contato', url: '', bg: 'transparent', fg: '#ffffff' },
      ],
    },
  },
];

/** Mescla o config salvo com os defaults — campo novo não quebra página antiga. */
export function presellConfig(raw: Record<string, unknown> | undefined): PresellConfig {
  const value = (raw ?? {}) as Partial<PresellConfig>;
  return {
    ...DEFAULT_PRESELL,
    ...value,
    benefits: value.benefits ?? DEFAULT_PRESELL.benefits,
    countdown: { ...DEFAULT_PRESELL.countdown, ...(value.countdown ?? {}) },
    scarcity: { ...DEFAULT_PRESELL.scarcity, ...(value.scarcity ?? {}) },
    proof: { ...DEFAULT_PRESELL.proof, ...(value.proof ?? {}) },
    tracking: { ...DEFAULT_PRESELL.tracking, ...(value.tracking ?? {}) },
  };
}

export function bioConfig(raw: Record<string, unknown> | undefined): BioConfig {
  const value = (raw ?? {}) as Partial<BioConfig>;
  return { ...DEFAULT_BIO, ...value, links: value.links ?? [] };
}

/** Escurece um hex — usado na borda automática da foto. */
export function darken(hex: string, amount = 0.08) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#ebebeb';

  const channels = [0, 2, 4].map((i) => {
    const value = parseInt(clean.slice(i, i + 2), 16);
    return Math.max(0, Math.round(value * (1 - amount)));
  });

  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
