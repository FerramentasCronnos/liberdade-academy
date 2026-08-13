'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveTemplate, deleteTemplate, type TemplateState } from '@/app/(app)/templates/actions';
import {
  DEFAULT_TEMPLATE_BODY,
  TEMPLATE_VARS,
  renderTemplate,
  type OfferTemplate,
} from '@/lib/affiliate';
import { IconCheck, IconMessage, IconX } from './icons';

const field =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear plantilla'}
    </button>
  );
}

export function TemplateStudio({ templates }: { templates: OfferTemplate[] }) {
  const [editing, setEditing] = useState<OfferTemplate | null>(null);
  const [body, setBody] = useState(DEFAULT_TEMPLATE_BODY);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [state, formAction] = useActionState<TemplateState, FormData>(saveTemplate, {});
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok) setEditing(null);
  }, [state.ok]);

  const startNew = () => {
    setEditing(null);
    setBody(DEFAULT_TEMPLATE_BODY);
  };

  const startEdit = (template: OfferTemplate) => {
    setEditing(template);
    setBody(template.body);
  };

  /** Insere a variável na posição do cursor, não no fim do texto. */
  const insertVar = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}${token}`);
      return;
    }

    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const preview = renderTemplate(body, values);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie a mensagem:', preview);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        {/* Lista */}
        <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[16px] font-semibold text-[var(--text)]">
              Mis plantillas
            </h2>
            <button
              type="button"
              onClick={startNew}
              className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
            >
              + Novo
            </button>
          </div>

          {templates.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-[var(--text-muted)]">
              Aún no hay plantillas. Escribe el mensaje abajo y guárdalo.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {templates.map((template) => (
                <li key={template.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => startEdit(template)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[14px] font-medium text-[var(--text)]">
                      {template.name}
                    </p>
                    <p className="truncate text-[12px] text-[var(--text-faint)]">
                      {template.body.split('\n')[0]}
                    </p>
                  </button>

                  {editing?.id === template.id && (
                    <span className="shrink-0 rounded-full bg-[var(--violet-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                      editando
                    </span>
                  )}

                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={template.id} />
                    <button
                      type="submit"
                      aria-label={`Excluir ${template.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Editor */}
        <form
          action={formAction}
          className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]"
        >
          <input type="hidden" name="id" value={editing?.id ?? ''} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
                Nombre de la plantilla
              </span>
              <input
                name="name"
                defaultValue={editing?.name ?? ''}
                key={editing?.id ?? 'new'}
                required
                placeholder="Oferta relámpago"
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
                Marketplace
              </span>
              <select
                name="marketplace"
                defaultValue={editing?.marketplace ?? 'shopee'}
                key={`mp-${editing?.id ?? 'new'}`}
                className={field}
              >
                <option value="shopee">Shopee</option>
                <option value="mercado_livre">Mercado Libre</option>
                <option value="amazon">Amazon</option>
                <option value="tiktok_shop">TikTok Shop</option>
              </select>
            </label>
          </div>

          <div className="mt-3">
            <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
              Mensaje
            </span>

            <div className="mb-2 flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertVar(variable.token)}
                  className="rounded-full bg-[var(--violet-soft)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] transition hover:opacity-80"
                >
                  {variable.label}
                </button>
              ))}
            </div>

            <textarea
              ref={bodyRef}
              name="body"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${field} resize-y font-mono text-[13px] leading-relaxed`}
            />
          </div>

          {state.error && (
            <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--money)]">
              <IconCheck className="h-4 w-4" />
              Plantilla guardada.
            </p>
          )}

          <div className="mt-3">
            <SaveButton editing={Boolean(editing)} />
          </div>
        </form>
      </div>

      {/* Prévia */}
      <aside className="flex flex-col gap-4">
        <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-[15px] font-semibold text-[var(--text)]">
            Datos del producto
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            Complétalos para ver el mensaje final. Vacío usa el ejemplo.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {TEMPLATE_VARS.map((variable) => {
              const key = variable.token.replace(/[{}]/g, '');
              return (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-[var(--text-muted)]">
                    {variable.label}
                  </span>
                  <input
                    value={values[key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={variable.sample}
                    className={`${field} py-2 text-[13px]`}
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="inline-flex items-center gap-2 font-display text-[15px] font-semibold text-[var(--text)]">
            <IconMessage className="h-4 w-4 text-[var(--money)]" />
            Vista previa en WhatsApp
          </h2>

          <div className="mt-3 rounded-2xl bg-[var(--bg-sunken)] p-3">
            <div className="rounded-2xl rounded-tl-md bg-[#dcf8c6] p-3 text-[13px] leading-relaxed whitespace-pre-wrap text-[#1f2c33] dark:bg-[#005c4b] dark:text-white">
              {preview}
            </div>
          </div>

          <button
            type="button"
            onClick={copyMessage}
            className="mt-3 w-full rounded-2xl bg-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            {copied ? '¡Mensaje copiado!' : 'Copiar mensaje'}
          </button>
        </section>
      </aside>
    </div>
  );
}
