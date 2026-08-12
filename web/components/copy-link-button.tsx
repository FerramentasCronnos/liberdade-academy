'use client';

import { useState } from 'react';
import { IconCheck, IconLink } from './icons';

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard bloqueado (http sem localhost): abre pro usuário copiar
      window.prompt('Copie o link:', url);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-[14px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
    >
      {copied ? (
        <>
          <IconCheck className="h-4 w-4 text-[var(--money)]" />
          Link copiado
        </>
      ) : (
        <>
          <IconLink className="h-4 w-4" />
          Copiar link
        </>
      )}
    </button>
  );
}
