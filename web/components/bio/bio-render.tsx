/* eslint-disable @next/next/no-img-element */

import type { BioConfig } from '@/lib/pages';

export interface BioData {
  title: string;
  subtitle?: string;
  avatar?: string;
  config: BioConfig;
}

/**
 * Renderiza a página de bio.
 * Compartilhado entre a pré-visualização do editor e a página pública, para
 * não existirem dois layouts divergindo com o tempo.
 */
export function BioRender({ data, scale = 1 }: { data: BioData; scale?: number }) {
  const { config } = data;

  // no fundo escuro o texto padrão precisa clarear
  const dark = isDark(config.bgColor);
  const titleColor = dark ? '#ffffff' : '#111827';
  const subtitleColor = dark ? 'rgba(255,255,255,.65)' : '#6b7280';

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ backgroundColor: config.bgColor, fontSize: 14 * scale }}
    >
      {config.banner && (
        <div
          className="h-[110px] w-full"
          style={{
            background: 'linear-gradient(120deg, #4b3fb0 0%, #c04a77 55%, #e3b352 100%)',
          }}
        />
      )}

      <div
        className={`flex flex-col items-center px-6 pb-8 text-center ${
          config.banner ? '-mt-12' : 'pt-10'
        }`}
      >
        {data.avatar ? (
          <img
            src={data.avatar}
            alt=""
            className="h-[92px] w-[92px] rounded-full object-cover"
            style={{ border: `4px solid ${config.bgColor}` }}
          />
        ) : (
          <span
            className="grid h-[92px] w-[92px] place-items-center rounded-full"
            style={{
              backgroundColor: dark ? 'rgba(255,255,255,.1)' : '#f1f5f9',
              border: `4px solid ${config.bgColor}`,
            }}
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke={subtitleColor} strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
            </svg>
          </span>
        )}

        <h1
          className="mt-3 font-bold leading-tight"
          style={{ color: titleColor, fontSize: 20 * scale }}
        >
          {data.title}
        </h1>

        {data.subtitle && (
          <p className="mt-1.5 leading-snug" style={{ color: subtitleColor, fontSize: 13 * scale }}>
            {data.subtitle}
          </p>
        )}

        <div className="mt-5 flex w-full flex-col gap-3">
          {config.links.map((link, index) => {
            const transparent = !link.bg || link.bg === 'transparent';
            return (
              <a
                key={index}
                href={link.url || undefined}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full px-5 py-3 font-semibold transition hover:brightness-95"
                style={{
                  backgroundColor: transparent ? 'transparent' : link.bg,
                  color: link.fg,
                  border: transparent ? `1px solid ${link.fg}33` : undefined,
                  fontSize: 14 * scale,
                }}
              >
                {link.label}
              </a>
            );
          })}

          {config.links.length === 0 && (
            <p style={{ color: subtitleColor, fontSize: 12.5 * scale }}>Sem links</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Luminância aproximada — decide se o texto vai claro ou escuro. */
function isDark(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;

  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}
