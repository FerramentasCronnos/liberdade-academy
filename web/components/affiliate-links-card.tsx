import { IconExternal } from './icons';
import { AFFILIATE_REQUEST_URL, upgradeFor, type PurchaseTier } from '@/lib/purchase-tier';
import type { PresellLink } from '@/lib/presell-link';

const TIER_LABEL: Record<PurchaseTier, string> = {
  main: 'Producto principal',
  up1: 'Franquicia',
  up2: 'Golden Ticket',
};

/**
 * Pedido de afiliação por nível de compra, ao lado da comissão nas Bank
 * Offers: cada membro vê só o link do seu nível e o convite para o próximo.
 */
export function AffiliateLinksCard({
  tier,
  presells = [],
  affiliateUrl,
}: {
  tier: PurchaseTier;
  /** Presells da oferta (uma por tipo de tráfego: DR, X1, Orgánico). */
  presells?: PresellLink[];
  /** Oferta com afiliação direta (ex.: Hotmart): o botão leva à página de recrutamento, não ao Telegram. */
  affiliateUrl?: string;
}) {
  const upgrade = upgradeFor(tier);
  // Hotmart (cursos) ou Rewardful (apps vendidos pela Stripe, comissão recorrente)
  const platform = affiliateUrl ? affiliatePlatform(affiliateUrl) : null;
  return (
    <div className="flex flex-col gap-2.5 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[12.5px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
        Tu nivel: {TIER_LABEL[tier]}
      </p>
      <a
        href={affiliateUrl ?? AFFILIATE_REQUEST_URL[tier]}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
      >
        {platform ? `Afíliate en ${platform}` : 'Solicita tus enlaces de afiliación'}
        <IconExternal className="h-4 w-4" />
      </a>
      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        {platform === 'Hotmart'
          ? 'Pide tu afiliación en Hotmart. Cuando te aprueben, Hotmart te da tu enlace de venta.'
          : platform === 'Rewardful'
            ? 'Crea tu cuenta de afiliado en Rewardful y recibe tu enlace de venta. Ganas comisión en cada mensualidad mientras tu cliente siga pagando.'
            : 'Te lleva al grupo de Telegram de tu nivel, donde recibes tus enlaces de venta.'}
      </p>

      {presells.length > 0 && (
        <>
          {presells.map((presell) => (
            <a
              key={presell.label || presell.url}
              href={presell.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
            >
              {presell.label ? `Rescata tu presell ${presell.label}` : 'Rescata tu página de presell'}
              <IconExternal className="h-4 w-4" />
            </a>
          ))}
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
            {presells.length > 1
              ? 'Elige la página según tu tráfico. Cada una está lista para recibirlo y enviarlo a la oferta con tu enlace.'
              : 'Tu página lista para recibir el tráfico y enviarlo a la oferta con tu enlace.'}
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

/** Plataforma do link de afiliação direta: Hotmart (cursos) ou Rewardful (apps pela Stripe). */
export function affiliatePlatform(url: string): 'Hotmart' | 'Rewardful' {
  return /hotmart\.com/i.test(url) ? 'Hotmart' : 'Rewardful';
}
