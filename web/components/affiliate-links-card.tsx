import { IconExternal } from './icons';
import { AFFILIATE_REQUEST_URL, upgradeFor, type PurchaseTier } from '@/lib/purchase-tier';

const TIER_LABEL: Record<PurchaseTier, string> = {
  main: 'Producto principal',
  up1: 'Franquicia',
  up2: 'Golden Ticket',
};

/**
 * Pedido de afiliação por nível de compra, ao lado da comissão nas Bank
 * Offers: cada membro vê só o link do seu nível e o convite para o próximo.
 */
export function AffiliateLinksCard({ tier, presellUrl }: { tier: PurchaseTier; presellUrl?: string }) {
  const upgrade = upgradeFor(tier);
  return (
    <div className="flex flex-col gap-2.5 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[12.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
        Tu nivel: {TIER_LABEL[tier]}
      </p>
      <a
        href={AFFILIATE_REQUEST_URL[tier]}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
      >
        Solicita tus enlaces de afiliación
        <IconExternal className="h-4 w-4" />
      </a>
      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        Te lleva al grupo de Telegram de tu nivel, donde recibes tus enlaces de venta.
      </p>

      {presellUrl && (
        <>
          <a
            href={presellUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
          >
            Rescata tu página de presell
            <IconExternal className="h-4 w-4" />
          </a>
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
            Tu página lista para recibir el tráfico y enviarlo a la oferta con tu enlace.
          </p>
        </>
      )}

      {upgrade.url && (
        <a
          href={upgrade.url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--money)] px-4 py-3 text-center text-[13.5px] font-semibold text-white transition hover:opacity-90"
        >
          {upgrade.label}
          <IconExternal className="h-4 w-4 shrink-0" />
        </a>
      )}
      {upgrade.url && <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">{upgrade.hint}</p>}
    </div>
  );
}
