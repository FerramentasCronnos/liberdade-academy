'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateLink, saveAccount, type AccountState, type LinkState } from '@/app/(app)/gerar-link/actions';
import {
  AFFILIATE_MARKETPLACES,
  type AffiliateAccount,
  type AffiliateMarketplace,
} from '@/lib/affiliate';
import { IconCheck, IconExternal, IconLink } from './icons';

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-[var(--brand)] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Gerando…' : 'Gerar link'}
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Salvando…' : 'Salvar'}
    </button>
  );
}

function CopyButton({ value }: { value: string }) {
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
      className="shrink-0 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
    >
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

export function LinkGenerator({
  accounts,
  ready,
}: {
  accounts: AffiliateAccount[];
  ready: string[];
}) {
  const [marketplace, setMarketplace] = useState<AffiliateMarketplace>('amazon');
  const [linkState, linkAction] = useActionState<LinkState, FormData>(generateLink, {});
  const [accountState, accountAction] = useActionState<AccountState, FormData>(saveAccount, {});

  const info = AFFILIATE_MARKETPLACES.find((m) => m.id === marketplace)!;
  const account = accounts.find((a) => a.marketplace === marketplace);
  const isReady = ready.includes(marketplace);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {AFFILIATE_MARKETPLACES.map((mp) => {
          const active = marketplace === mp.id;
          const connected = accounts.find((a) => a.marketplace === mp.id)?.connected;
          return (
            <button
              key={mp.id}
              type="button"
              onClick={() => setMarketplace(mp.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-[var(--shadow-soft)] transition ${
                active
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: mp.color }}
                aria-hidden
              />
              {mp.label}
              {connected && <IconCheck className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-[13.5px] leading-relaxed text-[var(--text-muted)]">{info.how}</p>

        {/* Cadastro da tag/id — só a Amazon gera link sem API hoje */}
        <form action={accountAction} className="mt-4">
          <input type="hidden" name="marketplace" value={marketplace} />
          <label className="block text-[13px] font-semibold text-[var(--text)]">{info.field}</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              name="publicId"
              defaultValue={account?.publicId ?? ''}
              placeholder={info.placeholder}
              disabled={!isReady}
              className="min-w-[200px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            {isReady && <SaveButton />}
            <a
              href={info.panelUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
            >
              Painel
              <IconExternal className="h-3.5 w-3.5" />
            </a>
          </div>

          {accountState.error && (
            <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
              {accountState.error}
            </p>
          )}
          {accountState.ok && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--money)]">
              <IconCheck className="h-4 w-4" />
              Salvo.
            </p>
          )}

          {!isReady && (
            <p className="mt-2 rounded-xl bg-[var(--bg-sunken)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              Integração ainda não disponível. Por enquanto, gere o link no painel de afiliados
              do {info.label} — assim que as credenciais de API forem cadastradas, isto passa a
              funcionar aqui.
            </p>
          )}
        </form>
      </section>

      {/* Gerador */}
      <form
        action={linkAction}
        className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]"
      >
        <input type="hidden" name="marketplace" value={marketplace} />

        <label className="block text-[13px] font-semibold text-[var(--text)]">
          URL do produto
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            name="url"
            type="url"
            required
            placeholder="https://www.amazon.com.br/dp/..."
            className="min-w-[240px] flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
          />
          <GenerateButton />
        </div>

        {linkState.error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {linkState.error}
          </p>
        )}

        {linkState.link && (
          <div className="mt-4 rounded-2xl bg-[var(--money-soft)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--money)]">
              Seu link de afiliado
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-[var(--bg-elevated)] px-3.5 py-2.5 text-[13px] text-[var(--text)]">
                {linkState.link.affiliateUrl}
              </code>
              <CopyButton value={linkState.link.affiliateUrl} />
            </div>
          </div>
        )}

        <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text-faint)]">
          <IconLink className="h-3.5 w-3.5" />
          Confira sempre o link antes de divulgar — é ele que credita sua comissão.
        </p>
      </form>
    </>
  );
}
