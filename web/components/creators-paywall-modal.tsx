'use client';

import { useEffect, useState } from 'react';
import { CREATORS_BENEFITS } from '@/lib/creators-access';
import { CreatorsCheckout } from './creators-checkout';
import { IconCheck, IconX } from './icons';

/**
 * Pop-up de assinatura da aba Creators.
 *
 * Qualquer parte bloqueada da tela (linha do ranking, vídeo, produto) chama
 * openPaywall(); o PaywallModalHost, montado uma vez por página, abre o
 * pop-up com os benefícios e o checkout da Stripe dentro dele. Evento no
 * window em vez de contexto: os cadeados ficam em componentes de servidor e
 * de cliente misturados.
 */
const EVENT = 'creators:paywall';

export function openPaywall() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT));
}

export function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 1 1 8 0V11" />
    </svg>
  );
}

/** Cobre o elemento pai (que precisa ser `relative`) com cadeado; clicar abre o pop-up. */
export function LockedOverlay({ label = 'Suscríbete para ver', className = '' }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={openPaywall}
      className={`absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[inherit] bg-[var(--bg-elevated)]/35 text-[var(--text)] backdrop-blur-[2px] transition hover:bg-[var(--bg-elevated)]/50 ${className}`}
      aria-label={label}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand)] text-white shadow-lg">
        <LockIcon className="h-5 w-5" />
      </span>
      <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-[12px] font-semibold shadow">{label}</span>
    </button>
  );
}

export function PaywallModalHost({ publishableKey, autoOpen = false }: { publishableKey?: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suscripción Creators"
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[26px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-lift)] sm:rounded-[26px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--accent-text)]">Creators</p>
            <h3 className="mt-1 font-display text-[22px] font-semibold leading-tight text-[var(--text)]">
              Desbloquea a todos los creadores que más venden
            </h3>
            <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
              Hoy ves 3 creadores gratis. Con la suscripción ves a todos, con sus videos, productos y contactos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--bg-sunken)] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {CREATORS_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--text)]">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--money-soft)] text-[var(--money)]">
                <IconCheck className="h-3 w-3" />
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-[30px] font-bold leading-none text-[var(--text)]">US$ 19</span>
          <span className="text-[13.5px] text-[var(--text-muted)]">/ mes · cancela cuando quieras</span>
        </div>

        <div className="mt-4">
          <CreatorsCheckout publishableKey={publishableKey} />
        </div>

        <p className="mt-3.5 text-center text-[12px] leading-snug text-[var(--text-faint)]">
          El acceso se libera automáticamente al confirmar el pago. ¿Ya pagaste y sigue bloqueado? Escribe al soporte.
        </p>
      </div>
    </div>
  );
}
