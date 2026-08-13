'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { darken, type PresellConfig, type PresellTemplate } from '@/lib/pages';

/**
 * Renderiza a página de presell.
 *
 * O mesmo componente serve a pré-visualização do editor e a página pública —
 * assim o que a pessoa vê enquanto edita é literalmente o que o visitante
 * recebe, sem dois layouts para manter em sincronia.
 */

export interface PresellData {
  template: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  config: PresellConfig;
}

function useCountdown(seconds: number, enabled: boolean) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    if (!enabled) return;

    const timer = setInterval(() => {
      setLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, enabled]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return { left, label: `${mm}:${ss}` };
}

/** Vagas caem de `initial` até `min` conforme o tempo passa — pressão suave. */
function useSeats(config: PresellConfig) {
  const [seats, setSeats] = useState(config.scarcity.initial);

  useEffect(() => {
    setSeats(config.scarcity.initial);
    if (!config.scarcity.enabled) return;

    const timer = setInterval(() => {
      setSeats((prev) => (prev > config.scarcity.min ? prev - 1 : prev));
    }, 25000);
    return () => clearInterval(timer);
  }, [config.scarcity.enabled, config.scarcity.initial, config.scarcity.min]);

  const taken = Math.max(0, config.scarcity.total - seats);
  const percent = Math.min(100, Math.round((taken / Math.max(1, config.scarcity.total)) * 100));
  return { seats, percent };
}

function Avatar({ src, color, border }: { src?: string; color: string; border: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="mx-auto h-[110px] w-[110px] rounded-full object-cover"
        style={{ border: `4px solid ${border}` }}
      />
    );
  }

  return (
    <div
      className="mx-auto grid h-[110px] w-[110px] place-items-center rounded-full text-[38px]"
      style={{ backgroundColor: color, border: `4px solid ${border}` }}
    >
      <span aria-hidden>✦</span>
    </div>
  );
}

export function PresellRender({
  data,
  onCta,
  scale = 1,
}: {
  data: PresellData;
  onCta?: () => void;
  /** <1 encolhe tudo para caber na moldura de celular do editor. */
  scale?: number;
}) {
  const { config } = data;
  const template = data.template as PresellTemplate;

  const countdown = useCountdown(config.countdown.duration, config.countdown.enabled);
  const { seats, percent } = useSeats(config);

  const border = config.photoBorder || darken(config.bgColor, 0.08);
  const background =
    config.bgMode === 'degrade'
      ? `linear-gradient(160deg, ${config.bgColor} 0%, ${config.bgColor2} 100%)`
      : config.bgColor;

  const isProof = template === 'prova_social';
  const isMinimal = template === 'minimalista';

  const cta = (
    <button
      type="button"
      onClick={onCta}
      className="w-full rounded-full px-5 py-3.5 font-bold text-white transition hover:brightness-95"
      style={{ backgroundColor: config.primaryColor, fontSize: 15 * scale }}
    >
      {config.buttonText}
    </button>
  );

  return (
    <div
      className="flex min-h-full flex-col items-center px-6 py-8 text-center"
      style={{ background, fontSize: 14 * scale }}
    >
      <Avatar src={data.avatar} color={config.primaryColor} border={border} />

      <h1
        className="mt-4 font-bold leading-tight"
        style={{ color: config.titleColor, fontSize: 22 * scale }}
      >
        {data.title}
      </h1>

      {data.subtitle && (
        <p
          className="mt-2 leading-snug"
          style={{ color: config.subtitleColor, fontSize: 13.5 * scale }}
        >
          {data.subtitle}
        </p>
      )}

      {/* Countdown: benefícios + contador + CTA + barra de vagas */}
      {template === 'countdown' && (
        <>
          {config.benefits.length > 0 && (
            <ul className="mt-5 flex w-full flex-col gap-2.5">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2.5 text-left">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    {benefit.icon}
                  </span>
                  <span style={{ color: config.subtitleColor, fontSize: 12.5 * scale }}>
                    {benefit.label}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {config.countdown.enabled && (
            <div
              className="mt-5 w-full rounded-2xl border px-4 py-3"
              style={{ borderColor: border, color: config.countdown.messageColor }}
            >
              {countdown.left > 0 ? (
                <>
                  <p style={{ fontSize: 11.5 * scale }}>{config.countdown.message}</p>
                  <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 26 * scale }}>
                    {countdown.label}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 11.5 * scale, color: config.countdown.expiredColor }}>
                  {config.countdown.expiredMessage}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 w-full">{cta}</div>

          {config.scarcity.enabled && (
            <div className="mt-3 flex w-full items-center gap-2">
              <span
                className="shrink-0 whitespace-nowrap"
                style={{ color: config.subtitleColor, fontSize: 10.5 * scale }}
              >
                ● {seats <= config.scarcity.min ? 'Última vaga' : `${seats} vagas`}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: config.primaryColor }}
                />
              </div>
              <span style={{ color: config.subtitleColor, fontSize: 10.5 * scale }}>
                {percent}%
              </span>
            </div>
          )}
        </>
      )}

      {/* Minimalista: só CTA */}
      {isMinimal && <div className="mt-6 w-full">{cta}</div>}

      {/* Prova social: cartão branco sobre fundo escuro */}
      {isProof && (
        <div className="mt-5 w-full rounded-3xl bg-white/95 p-4 text-[#1f2937] shadow-lg">
          <p className="font-bold leading-snug" style={{ fontSize: 15 * scale }}>
            {config.proof.highlight}
          </p>

          {config.scarcity.enabled && (
            <>
              <p className="mt-2 font-semibold" style={{ fontSize: 12.5 * scale }}>
                ⚡ Restam {seats} vagas hoje
              </p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: config.primaryColor }}
                />
              </div>
            </>
          )}

          <div className="mt-3">{cta}</div>

          <p className="mt-2 text-[#6b7280]" style={{ fontSize: 10.5 * scale }}>
            {config.proof.note}
          </p>

          {config.proof.testimonial && (
            <p
              className="mt-3 rounded-2xl bg-black/5 px-3 py-2.5 italic text-[#374151]"
              style={{ fontSize: 11.5 * scale }}
            >
              {config.proof.testimonial}
            </p>
          )}
        </div>
      )}

      <p className="mt-4" style={{ color: config.subtitleColor, fontSize: 11 * scale }}>
        {config.footerText}
      </p>
    </div>
  );
}
