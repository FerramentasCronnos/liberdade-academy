import { CREATORS_CHECKOUT_URL } from '@/lib/creators-access';
import { CreatorsCheckout } from '@/components/creators-checkout';
import { IconCheck } from './icons';

/**
 * Paywall da aba Creators.
 *
 * Quem não tem a assinatura vê a página de verdade atrás de um desfoque: dá
 * para perceber que é um ranking com números, sem conseguir ler nenhum. O
 * conteúdo embaçado fica inerte (sem clique, sem seleção, fora do leitor de
 * tela) e com altura limitada, para o cartão de venda ficar sempre visível.
 */
const BENEFITS = [
  'Ranking de los 50 creadores que más venden en TikTok Shop US, actualizado cada 2 días',
  'Perfil completo: ingresos, crecimiento, seguidores, vistas, engagement y precio promedio',
  '20 videos y anuncios por creador, con las ventas de cada video',
  'Los 20 productos que vende cada creador, con la comisión',
  'Favoritos para armar tu lista de creadores a contactar',
  'Datos de contacto cuando están disponibles',
];

export function CreatorsPaywall({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;

  const checkoutUrl = CREATORS_CHECKOUT_URL;
  // checkout embutido quando a chave publicável existe; link de pagamento como alternativa
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none max-h-[70vh] select-none overflow-hidden blur-[6px]"
      >
        {children}
      </div>

      {/* Esmaece a parte de baixo do conteúdo embaçado até o fundo da página. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-[var(--bg)]"
      />

      <div className="absolute inset-0 flex items-start justify-center px-4 pt-6 sm:items-center sm:pt-0">
        <section
          aria-label="Suscripción a Creators"
          className="w-full max-w-[460px] rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)] sm:p-8"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
            Acceso Creators
          </p>
          <h2 className="font-display mt-1.5 text-[24px] font-semibold leading-tight tracking-tight text-[var(--text)]">
            Creators es un acceso aparte
          </h2>
          <p className="mt-2 text-[14px] text-[var(--text-muted)]">
            Una suscripción separada de tu membresía, con todo lo que necesitas para elegir
            a quién contactar.
          </p>

          <p className="mt-5 flex items-baseline gap-1.5">
            <span className="font-display text-[34px] font-semibold tracking-tight text-[var(--text)]">
              US$ 19
            </span>
            <span className="text-[14px] text-[var(--text-muted)]">/ mes</span>
          </p>

          <ul className="mt-5 space-y-2.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--text)]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                  <IconCheck className="h-3 w-3" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          {publishableKey ? (
            <div className="mt-6">
              <CreatorsCheckout publishableKey={publishableKey} />
            </div>
          ) : checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
            >
              Suscribirme por US$ 19/mes
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-6 flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-3 text-[14.5px] font-semibold text-white opacity-60"
            >
              Enlace de pago próximamente
            </button>
          )}

          <p className="mt-3.5 text-center text-[12.5px] leading-snug text-[var(--text-muted)]">
            ¿Ya pagaste? El acceso se libera automáticamente en unos minutos. Si no, escribe al
            soporte.
          </p>
        </section>
      </div>
    </div>
  );
}
