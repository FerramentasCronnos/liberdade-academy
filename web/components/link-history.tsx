'use client';

import { useState } from 'react';
import { deleteLink } from '@/app/(app)/gerar-link/actions';
import { MARKETPLACE_LABEL, type AffiliateLink } from '@/lib/affiliate';
import { IconX } from './icons';

function CopyCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie o link:', value);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
    >
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

export function LinkHistory({ links }: { links: AffiliateLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
        Links gerados
      </h2>

      <ul className="mt-3 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
        {links.map((link) => (
          <li key={link.id} className="flex items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-[var(--text)]">
                {link.affiliateUrl}
              </p>
              <p className="text-[11.5px] text-[var(--text-faint)]">
                {MARKETPLACE_LABEL[link.marketplace] ?? link.marketplace} ·{' '}
                {new Date(link.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <CopyCell value={link.affiliateUrl} />

            <form action={deleteLink}>
              <input type="hidden" name="id" value={link.id} />
              <button
                type="submit"
                aria-label="Remover link"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <IconX className="h-4 w-4" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
