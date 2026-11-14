/**
 * Historia y resultados de um produto (aba da oferta): números de destaque e
 * marcos em ordem cronológica, cada um com prints em carrossel.
 *
 * Chave = externalId da oferta (ex.: 'mva'). Os prints ficam em
 * public/timeline/<oferta>/ (sem dados pessoais: nome e e-mail cobertos).
 */
export type TimelineHighlight = {
  /** Número já formatado, como deve aparecer (ex.: 'US$ 120 mil'). */
  value: string;
  label: string;
};

export type TimelineMilestone = {
  /** Data curta, como deve aparecer (ex.: 'Oct 2025'). */
  date: string;
  title: string;
  /** Número do marco, opcional (ex.: { value: '1.000', label: 'alumnos' }). */
  stat?: TimelineHighlight;
  text?: string;
  /** Prints do marco (URLs públicas), na ordem do carrossel. */
  images: string[];
};

export type ProductTimeline = {
  /** Rascunho: só o admin vê a aba (para revisar antes de publicar). */
  draft?: boolean;
  /** Título da aba (padrão: 'Historia del producto'). */
  title?: string;
  intro?: string;
  highlights: TimelineHighlight[];
  /** Do mais antigo ao mais recente. */
  milestones: TimelineMilestone[];
};

const P = '/timeline/mva';

const TIMELINES: Record<string, ProductTimeline> = {
  mva: {
    title: 'El MVA en números',
    intro:
      'Resultados reales del funnel del MVA, directo del panel de la S4 y del Administrador de Anuncios de Meta. Valores en reales (R$), como aparecen en los paneles.',
    highlights: [
      { value: '131', label: 'Ventas · 1 al 13 nov' },
      { value: 'R$ 103.633', label: 'Facturado · 1 al 13 nov' },
      { value: 'R$ 73.568', label: 'En anuncios · 1 al 13 nov' },
      { value: '37', label: 'Franquicias (upsell)' },
    ],
    milestones: [
      {
        date: '14 oct – 12 nov',
        title: 'Escala en Meta Ads',
        stat: { value: '229', label: 'campañas' },
        text: '805.124 impresiones y 19.805 clics en el enlace en 30 días, con CTR de 2,46%.',
        images: [`${P}/meta-campanhas-1.jpg`, `${P}/meta-campanhas-2.jpg`],
      },
      {
        date: 'Oct – nov 2026',
        title: 'Los creativos que venden',
        text: 'Cada creativo del funnel con su gasto, ingreso y ROAS. Los mejores pasan de 1,5x de retorno.',
        images: [`${P}/creativos.jpg`],
      },
      {
        date: '1 – 13 nov',
        title: 'El funnel completo',
        stat: { value: '131', label: 'ventas' },
        text: 'De 405.176 impresiones a 8.500 visitas en la página, 1.045 clics para comprar y 131 ventas, con ticket medio de R$ 791. Después de la compra, 37 personas tomaron la Franquicia.',
        images: [`${P}/funil-mes.jpg`, `${P}/funil-mapa.jpg`],
      },
      {
        date: '1 – 13 nov',
        title: 'Facturación y margen',
        stat: { value: 'R$ 103.633', label: 'facturado' },
        text: 'R$ 73.568 invertidos en anuncios, ROAS de 1,41x y R$ 24.443 de margen después de anuncios, impuestos, tasas y reembolsos.',
        images: [`${P}/aquisicao-mes.jpg`],
      },
      {
        date: '9 – 13 nov',
        title: 'La última semana',
        stat: { value: '53', label: 'ventas' },
        text: 'R$ 42.598 facturados con R$ 30.122 en anuncios y costo por venta de R$ 568.',
        images: [`${P}/aquisicao-semana.jpg`, `${P}/funil-semana.jpg`],
      },
      {
        date: '12 y 13 nov',
        title: 'Día a día',
        stat: { value: '2,79x', label: 'ROAS el 13/11' },
        text: 'El 12/11: 11 ventas y R$ 8.444. El 13/11: 12 ventas y R$ 12.531 facturados con R$ 4.498 en anuncios.',
        images: [`${P}/dia-12.jpg`, `${P}/dia-13.jpg`],
      },
    ],
  },
};

/** Linha do tempo do produto, se existir e o usuário puder ver. */
export function productTimeline(externalId: string | null | undefined, isAdmin: boolean): ProductTimeline | null {
  const timeline = externalId ? TIMELINES[externalId] : undefined;
  if (!timeline || timeline.milestones.length === 0) return null;
  if (timeline.draft && !isAdmin) return null;
  return timeline;
}
