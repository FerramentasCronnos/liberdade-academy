'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { savePage, type PageState } from '@/app/(app)/paginas/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { bioConfig, type BioConfig, type BioLink, type LandingPage } from '@/lib/pages';
import { PhoneFrame } from '../presell/phone-frame';
import { BioRender } from './bio-render';
import { IconCheck, IconUpload, IconX } from '../icons';

const input =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

const label = 'mb-1.5 block text-[12.5px] font-semibold text-[var(--text)]';

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

export function BioEditor({ page }: { page: LandingPage }) {
  const [title, setTitle] = useState(page.title);
  const [subtitle, setSubtitle] = useState(page.subtitle ?? '');
  const [avatar, setAvatar] = useState(page.avatar);
  const [config, setConfig] = useState<BioConfig>(bioConfig(page.config));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState<PageState, FormData>(savePage, {});

  const setLink = (index: number, patch: Partial<BioLink>) =>
    setConfig((prev) => ({
      ...prev,
      links: prev.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));

  /** Reordena por botão em vez de arrastar: funciona no toque e no teclado. */
  const move = (index: number, direction: -1 | 1) =>
    setConfig((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.links.length) return prev;

      const links = [...prev.links];
      [links[index], links[target]] = [links[target], links[index]];
      return { ...prev, links };
    });

  const onPickFile = async (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);
    if (result.url) setAvatar(result.url);
    setUploading(false);
  };

  const payload = JSON.stringify({
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

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-[14px] font-semibold text-[var(--text)]">Perfil</h3>

          <div className="flex items-center gap-4">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--bg-sunken)] text-[var(--text-faint)]">
                <IconUpload className="h-5 w-5" />
              </span>
            )}

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
                className="text-[12.5px] font-medium text-[var(--text-muted)] transition hover:text-red-600"
              >
                Remover
              </button>
            )}
          </div>

          <label className={`${label} mt-4`}>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />

          <label className={`${label} mt-3`}>Subtítulo (opcional)</label>
          <textarea
            rows={2}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className={`${input} resize-none`}
          />

          <label className={`${label} mt-3`}>Cor de fundo da página</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Cor de fundo"
              value={/^#[0-9a-f]{6}$/i.test(config.bgColor) ? config.bgColor : '#ffffff'}
              onChange={(e) => setConfig((prev) => ({ ...prev, bgColor: e.target.value }))}
              className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
            />
            <input
              value={config.bgColor}
              onChange={(e) => setConfig((prev) => ({ ...prev, bgColor: e.target.value }))}
              className={`${input} font-mono`}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-[var(--text)]">Colocar banner</p>
              <p className="text-[12px] text-[var(--text-muted)]">
                Degradê de 3 cores no topo com card sobreposto.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.banner}
              aria-label="Alternar banner"
              onClick={() => setConfig((prev) => ({ ...prev, banner: !prev.banner }))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                config.banner ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                  config.banner ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-[14px] font-semibold text-[var(--text)]">Links</h3>

          <div className="flex flex-col gap-3">
            {config.links.map((link, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[var(--border)] p-3"
              >
                {/* prévia do próprio botão, como na referência */}
                <div
                  className="mb-2.5 rounded-full px-4 py-2 text-center text-[13px] font-semibold"
                  style={{
                    backgroundColor:
                      !link.bg || link.bg === 'transparent' ? 'transparent' : link.bg,
                    color: link.fg,
                    border:
                      !link.bg || link.bg === 'transparent' ? `1px solid ${link.fg}44` : undefined,
                  }}
                >
                  {link.label || 'Sem título'}
                </div>

                <input
                  value={link.label}
                  onChange={(e) => setLink(index, { label: e.target.value })}
                  placeholder="Nome do botão"
                  className={input}
                />
                <input
                  value={link.url}
                  onChange={(e) => setLink(index, { url: e.target.value })}
                  placeholder="https://..."
                  className={`${input} mt-2`}
                />

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(link.bg) ? link.bg : '#22c55e'}
                      onChange={(e) => setLink(index, { bg: e.target.value })}
                      className="h-8 w-9 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                    />
                    Botão
                  </label>

                  <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(link.fg) ? link.fg : '#ffffff'}
                      onChange={(e) => setLink(index, { fg: e.target.value })}
                      className="h-8 w-9 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                    />
                    Texto
                  </label>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Mover para cima"
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === config.links.length - 1}
                      aria-label="Mover para baixo"
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          links: prev.links.filter((_, i) => i !== index),
                        }))
                      }
                      aria-label="Remover link"
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setConfig((prev) => ({
                ...prev,
                links: [...prev.links, { label: '', url: '', bg: '#4b3fb0', fg: '#ffffff' }],
              }))
            }
            className="mt-3 w-full rounded-xl border border-dashed border-[var(--border-strong)] py-2.5 text-[13px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            + Adicionar link
          </button>
        </section>

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
          <BioRender data={{ title, subtitle, avatar, config }} scale={0.94} />
        </PhoneFrame>
        <p className="mt-2 text-center text-[11.5px] text-[var(--text-faint)]">
          Preview atualizado em tempo real
        </p>
      </aside>
    </div>
  );
}
