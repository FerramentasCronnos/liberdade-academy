import { IconExternal } from './icons';

/**
 * Recursos do afiliado nas Bank Offers: criativos e presell de cada produto
 * (gravados no produto) e os links de venda da rede, iguais para todas as
 * ofertas próprias.
 */
export const BANK_OFFERS_SALES_LINKS = [
  { label: 'Producto principal', url: 'https://lp.theaffiliatecentral.com/Network_MVA' },
  { label: 'Upsell 1 · Franquicia', url: 'https://lp.theaffiliatecentral.com/Network_MVA_Franquia' },
  { label: 'Upsell 2 · Golden', url: 'https://lp.theaffiliatecentral.com/Network_MVA_Golden' },
];

const KIND_LABEL: Record<string, { title: string; hint: string; emoji: string }> = {
  creatives: { title: 'Creativos', hint: 'Carpeta con videos, imágenes y anuncios listos para usar.', emoji: '🎬' },
  presell: { title: 'Página de presell', hint: 'Rescata tu página lista para recibir el tráfico y enviarlo a la oferta.', emoji: '📄' },
  link: { title: 'Enlace', hint: '', emoji: '🔗' },
};

/**
 * Links de resgate da presell (Wix) são praticamente senhas: ficam na env
 * BANK_OFFERS_PRESELL_LINKS como JSON {slug: url}, nunca no código nem no banco.
 */
function presellLink(slug?: string): string | undefined {
  if (!slug) return undefined;
  try {
    const map = JSON.parse(process.env.BANK_OFFERS_PRESELL_LINKS || '{}') as Record<string, string>;
    return map[slug];
  } catch {
    return undefined;
  }
}

export function BankOfferResources({
  resources = [],
  slug,
}: {
  resources?: Array<{ kind: string; label: string; url: string }>;
  slug?: string;
}) {
  const presell = presellLink(slug);
  const items = presell ? [...resources, { kind: 'presell', label: 'Rescata tu página de presell', url: presell }] : resources;
  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Recursos para afiliados</h3>
      <p className="mt-1 text-[13px] text-[var(--text-muted)]">
        Todo lo que necesitas para promocionar esta oferta: creativos, tu página de presell y tus enlaces de venta.
      </p>

      {items.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((r) => {
            const meta = KIND_LABEL[r.kind] ?? KIND_LABEL.link;
            return (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-4 transition hover:border-[var(--brand)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[18px]" aria-hidden>
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[var(--text)]">{r.label}</span>
                  {meta.hint && <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--text-muted)]">{meta.hint}</span>}
                </span>
                <IconExternal className="mt-1 h-4 w-4 shrink-0 text-[var(--text-faint)]" />
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-[18px] bg-[var(--bg-sunken)] p-4">
        <p className="text-[13.5px] font-semibold text-[var(--text)]">Tus enlaces de venta</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          Genera aquí tu enlace de afiliado para el producto principal y los upsells.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BANK_OFFERS_SALES_LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
            >
              {l.label}
              <IconExternal className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
