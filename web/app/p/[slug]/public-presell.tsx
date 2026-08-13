'use client';

import Script from 'next/script';
import { useState } from 'react';
import { PresellRender, type PresellData } from '@/components/presell/presell-render';
import { API_URL } from '@/lib/api';

/**
 * Página pública de presell.
 *
 * O clique não é um link direto: ele passa pela API para escolher o grupo da
 * vez, contar e registrar a origem. Só depois redireciona ao WhatsApp.
 */
export function PublicPresell({
  slug,
  data,
  pixelId,
}: {
  slug: string;
  data: PresellData;
  pixelId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCta = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const params = new URLSearchParams(window.location.search);

    try {
      const response = await fetch(`${API_URL}/public/pages/${slug}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utm_source: params.get('utm_source') ?? undefined,
          utm_medium: params.get('utm_medium') ?? undefined,
          utm_campaign: params.get('utm_campaign') ?? undefined,
          utm_content: params.get('utm_content') ?? undefined,
          utm_term: params.get('utm_term') ?? undefined,
          referrer: document.referrer || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? 'No fue posible abrir el grupo ahora.');
        setBusy(false);
        return;
      }

      const { url } = (await response.json()) as { url: string };

      // dispara o Lead antes de sair da página
      if (pixelId && typeof window.fbq === 'function') window.fbq('track', 'Lead');

      window.location.href = url;
    } catch {
      setError('No fue posible abrir el grupo ahora. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh">
      {pixelId && /^\d+$/.test(pixelId) && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${pixelId}');fbq('track','PageView');
          `}
        </Script>
      )}

      <div className="mx-auto min-h-dvh w-full max-w-[440px]">
        <PresellRender data={data} onCta={onCta} />

        {error && (
          <p role="alert" className="px-6 pb-6 text-center text-[13px] font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
