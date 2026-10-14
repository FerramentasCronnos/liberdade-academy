'use client';

import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';

/**
 * Checkout da Stripe dentro da página (assinatura Creators). Só carrega o
 * script da Stripe quando a pessoa clica em assinar; até lá é um botão.
 */
export function CreatorsCheckout({ publishableKey, price = 'US$ 20 / mes' }: { publishableKey?: string; price?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch('/api/stripe/checkout', { method: 'POST' });
    const data = (await response.json().catch(() => ({}))) as { clientSecret?: string; message?: string };
    if (!response.ok || !data.clientSecret) throw new Error(data.message || 'No pude iniciar el pago.');
    return data.clientSecret;
  }, []);

  if (!publishableKey) {
    return (
      <button type="button" disabled className="w-full rounded-2xl bg-[var(--brand)] px-5 py-3 text-[14px] font-semibold text-white opacity-60">
        Pago disponible muy pronto
      </button>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="w-full rounded-2xl bg-[var(--brand)] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
        >
          Suscribirme por {price}
        </button>
        {error && <p className="text-[12.5px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <EmbeddedCheckoutProvider
        stripe={loadStripe(publishableKey)}
        options={{
          fetchClientSecret: () =>
            fetchClientSecret().catch((e) => {
              setError(e instanceof Error ? e.message : 'No pude iniciar el pago.');
              setOpen(false);
              throw e;
            }),
        }}
      >
        <EmbeddedCheckout className="min-h-[520px]" />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
