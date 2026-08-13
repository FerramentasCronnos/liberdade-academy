'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { savePage, type PageState } from '@/app/(app)/paginas/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import {
  BENEFIT_ICONS,
  PRESELL_TEMPLATES,
  presellConfig,
  type LandingPage,
  type PresellConfig,
} from '@/lib/pages';
import { PhoneFrame } from './phone-frame';
import { PresellRender } from './presell-render';
import { IconCheck, IconUpload, IconX } from '../icons';

const input =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

const label = 'mb-1.5 block text-[12.5px] font-semibold text-[var(--text)]';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <h3 className="mb-3 text-[14px] font-semibold text-[var(--text)]">{title}</h3>
      {children}
    </section>
  );
}

/** Campo de cor: swatch nativo + hex editável, como na referência. */
function ColorField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={input}
      />
      <input
        type="color"
        aria-label="Escolher cor"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
      />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Salvando…' : 'Salvar alterações'}
    </button>
  );
}

export function PresellEditor({ page }: { page: LandingPage }) {
  const [template, setTemplate] = useState(page.template);
  const [title, setTitle] = useState(page.title);
  const [subtitle, setSubtitle] = useState(page.subtitle ?? '');
  const [avatar, setAvatar] = useState(page.avatar);
  const [config, setConfig] = useState<PresellConfig>(presellConfig(page.config));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState<PageState, FormData>(savePage, {});

  const set = <K extends keyof PresellConfig>(key: K, value: PresellConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const onPickFile = async (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);
    if (result.url) setAvatar(result.url);
    setUploading(false);
  };

  const payload = JSON.stringify({
    template,
    title,
    subtitle: subtitle || null,
    avatar: avatar || null,
    config,
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="payload" value={payload} />

        <Card title="Template">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className={input}
          >
            {PRESELL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11.5px] text-[var(--text-faint)]">
            Renderizando com o layout{' '}
            <strong>{PRESELL_TEMPLATES.find((t) => t.id === template)?.label}</strong>.
          </p>
        </Card>

        <Card title="Foto">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPickFile(file);
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] disabled:opacity-60"
            >
              <IconUpload className="h-4 w-4" />
              {uploading ? 'Enviando…' : 'Enviar imagem'}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar(undefined)}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--text-muted)] transition hover:text-red-600"
              >
                <IconX className="h-3.5 w-3.5" />
                Remover
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px] text-[var(--text-faint)]">
            PNG, JPG, WEBP ou GIF, até 5MB.
          </p>
        </Card>

        <Card title="Textos">
          <label className={label}>Título</label>
          <div className="flex items-center gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
            <input
              type="color"
              aria-label="Cor do título"
              value={config.titleColor}
              onChange={(e) => set('titleColor', e.target.value)}
              className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
            />
          </div>

          <label className={`${label} mt-3`}>Subtítulo</label>
          <div className="flex items-start gap-2">
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              className={`${input} resize-none`}
            />
            <input
              type="color"
              aria-label="Cor do subtítulo"
              value={config.subtitleColor}
              onChange={(e) => set('subtitleColor', e.target.value)}
              className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
            />
          </div>

          <label className={`${label} mt-3`}>Texto do botão</label>
          <input
            value={config.buttonText}
            onChange={(e) => set('buttonText', e.target.value)}
            className={input}
          />

          <label className={`${label} mt-3`}>Rodapé</label>
          <input
            value={config.footerText}
            onChange={(e) => set('footerText', e.target.value)}
            className={input}
          />
        </Card>

        <Card title="Cores">
          <label className={label}>Cor principal</label>
          <ColorField value={config.primaryColor} onChange={(v) => set('primaryColor', v)} />

          <div className="mt-3 flex items-center gap-2">
            <span className={`${label} mb-0`}>Fundo</span>
            <div className="inline-flex overflow-hidden rounded-full border border-[var(--border)]">
              {(['solido', 'degrade'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set('bgMode', mode)}
                  className={`px-3 py-1 text-[11.5px] font-semibold transition ${
                    config.bgMode === mode
                      ? 'bg-[var(--brand)] text-white'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {mode === 'solido' ? 'Sólido' : 'Degradê'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <ColorField value={config.bgColor} onChange={(v) => set('bgColor', v)} />
          </div>

          {config.bgMode === 'degrade' && (
            <div className="mt-2">
              <label className={label}>Segunda cor do degradê</label>
              <ColorField value={config.bgColor2} onChange={(v) => set('bgColor2', v)} />
            </div>
          )}

          <label className={`${label} mt-3`}>Borda da foto</label>
          <ColorField
            value={config.photoBorder}
            onChange={(v) => set('photoBorder', v)}
            placeholder="Automático"
          />
          <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">
            Deixe em branco para usar a cor do fundo levemente escurecida.
          </p>
        </Card>

        <Card title="Benefícios">
          <div className="flex flex-col gap-2">
            {config.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={benefit.icon}
                  onChange={(e) => {
                    const next = [...config.benefits];
                    next[index] = { ...benefit, icon: e.target.value };
                    set('benefits', next);
                  }}
                  className="h-10 w-14 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-center text-[15px]"
                >
                  {BENEFIT_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <input
                  value={benefit.label}
                  onChange={(e) => {
                    const next = [...config.benefits];
                    next[index] = { ...benefit, label: e.target.value };
                    set('benefits', next);
                  }}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'benefits',
                      config.benefits.filter((_, i) => i !== index),
                    )
                  }
                  aria-label="Remover benefício"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => set('benefits', [...config.benefits, { icon: '⭐', label: '' }])}
            className="mt-2 w-full rounded-xl border border-dashed border-[var(--border-strong)] py-2.5 text-[13px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            + Adicionar benefício
          </button>
        </Card>

        <Card title="Contador regressivo">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--text-muted)]">Mostrar contador</span>
            <Toggle
              on={config.countdown.enabled}
              onChange={(v) => set('countdown', { ...config.countdown, enabled: v })}
            />
          </div>

          {config.countdown.enabled && (
            <>
              <label className={`${label} mt-3`}>Duração (segundos)</label>
              <input
                type="number"
                min={5}
                value={config.countdown.duration}
                onChange={(e) =>
                  set('countdown', { ...config.countdown, duration: Number(e.target.value) || 60 })
                }
                className={input}
              />

              <label className={`${label} mt-3`}>Mensagem do contador</label>
              <div className="flex items-start gap-2">
                <textarea
                  rows={2}
                  value={config.countdown.message}
                  onChange={(e) =>
                    set('countdown', { ...config.countdown, message: e.target.value })
                  }
                  className={`${input} resize-none`}
                />
                <input
                  type="color"
                  aria-label="Cor da mensagem"
                  value={config.countdown.messageColor}
                  onChange={(e) =>
                    set('countdown', { ...config.countdown, messageColor: e.target.value })
                  }
                  className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
                />
              </div>

              <label className={`${label} mt-3`}>Mensagem no fim (expirado)</label>
              <div className="flex items-start gap-2">
                <textarea
                  rows={3}
                  value={config.countdown.expiredMessage}
                  onChange={(e) =>
                    set('countdown', { ...config.countdown, expiredMessage: e.target.value })
                  }
                  className={`${input} resize-none`}
                />
                <input
                  type="color"
                  aria-label="Cor da mensagem final"
                  value={config.countdown.expiredColor}
                  onChange={(e) =>
                    set('countdown', { ...config.countdown, expiredColor: e.target.value })
                  }
                  className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
                />
              </div>
            </>
          )}
        </Card>

        <Card title="Escassez de vagas">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--text-muted)]">Mostrar vagas</span>
            <Toggle
              on={config.scarcity.enabled}
              onChange={(v) => set('scarcity', { ...config.scarcity, enabled: v })}
            />
          </div>

          {config.scarcity.enabled && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['initial', 'min', 'total'] as const).map((key) => (
                <div key={key}>
                  <label className={label}>
                    {key === 'initial' ? 'Inicial' : key === 'min' ? 'Mínimo' : 'Total'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={config.scarcity[key]}
                    onChange={(e) =>
                      set('scarcity', {
                        ...config.scarcity,
                        [key]: Number(e.target.value) || 0,
                      })
                    }
                    className={input}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {template === 'prova_social' && (
          <Card title="Prova social">
            <label className={label}>Chamada</label>
            <input
              value={config.proof.highlight}
              onChange={(e) => set('proof', { ...config.proof, highlight: e.target.value })}
              className={input}
            />

            <label className={`${label} mt-3`}>Aviso</label>
            <input
              value={config.proof.note}
              onChange={(e) => set('proof', { ...config.proof, note: e.target.value })}
              className={input}
            />

            <label className={`${label} mt-3`}>Depoimento</label>
            <textarea
              rows={3}
              value={config.proof.testimonial}
              onChange={(e) => set('proof', { ...config.proof, testimonial: e.target.value })}
              className={`${input} resize-none`}
            />
          </Card>
        )}

        <Card title="Rastreamento (Meta Pixel + CAPI)">
          <label className={label}>Pixel ID</label>
          <input
            value={config.tracking.pixelId}
            onChange={(e) => set('tracking', { ...config.tracking, pixelId: e.target.value })}
            placeholder="1234567890"
            className={input}
          />
          {config.tracking.pixelId && !/^\d+$/.test(config.tracking.pixelId) && (
            <p className="mt-1 text-[11.5px] font-medium text-red-600 dark:text-red-400">
              O Pixel ID deve conter apenas números — copie o ID do Gerenciador de Eventos (não
              use e-mail ou nome).
            </p>
          )}

          <label className={`${label} mt-3`}>
            Access Token (CAPI){' '}
            <span className="font-normal text-[var(--text-faint)]">opcional</span>
          </label>
          <input
            type="password"
            value={config.tracking.capiToken}
            onChange={(e) => set('tracking', { ...config.tracking, capiToken: e.target.value })}
            className={input}
          />
          <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">
            Opcional — o rastreamento pelo navegador já funciona só com o Pixel ID.
          </p>

          <label className={`${label} mt-3`}>Test Event Code (opcional)</label>
          <input
            value={config.tracking.testEventCode}
            onChange={(e) =>
              set('tracking', { ...config.tracking, testEventCode: e.target.value })
            }
            placeholder="TEST12345"
            className={input}
          />
        </Card>

        <div className="flex items-center gap-3">
          <SaveButton />
          {state.error && (
            <span role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">
              {state.error}
            </span>
          )}
          {state.ok && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--money)]">
              <IconCheck className="h-4 w-4" />
              Salvo.
            </span>
          )}
        </div>
      </form>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <PhoneFrame>
          <PresellRender
            data={{ template, title, subtitle, avatar, config }}
            scale={0.92}
          />
        </PhoneFrame>
        <p className="mt-2 text-center text-[11.5px] text-[var(--text-faint)]">
          Pré-visualização em tempo real
        </p>
      </aside>
    </div>
  );
}
