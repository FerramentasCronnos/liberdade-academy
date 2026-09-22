'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPost } from '@/app/(app)/comunidade/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { normalizeTag, SUGGESTED_TAGS, type Space } from '@/lib/community';
import { IconImage, IconX } from './icons';

function Submit({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Publicando…' : label}
    </button>
  );
}

const INTRO_TEMPLATE = `¡Hola! Soy … y vivo en …

Mi nicho: …
Cómo empecé: …
Mi meta con la comunidad: …`;

/**
 * Compositor de publicações.
 *
 * No feed geral escolhe-se o espaço; dentro de um espaço ele vem fixo.
 * O espaço de apresentações traz um modelo para ninguém travar na página
 * em branco; o de anúncios só aparece para a equipe.
 */
export function PostComposer({
  spaces,
  space,
  userName,
  isAdmin = false,
}: {
  spaces: Space[];
  /** Espaço fixo (página de espaço). */
  space?: Space;
  userName?: string;
  isAdmin?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const available = spaces.filter((s) => s.kind !== 'announcements' || isAdmin);
  const [slug, setSlug] = useState(space?.slug ?? available.find((s) => s.kind === 'posts')?.slug ?? 'consejos');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [open, setOpen] = useState(Boolean(space));
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = spaces.find((s) => s.slug === slug);
  const isIntro = current?.kind === 'intro';

  // ação envolvida para limpar o formulário só quando o servidor confirmar
  const formAction = async (formData: FormData) => {
    const result = await createPost({}, formData);
    if (!result.ok) {
      setError(result.error ?? 'No pude publicar ahora.');
      return;
    }
    setError(null);
    formRef.current?.reset();
    setImage(null);
    setTags([]);
    setTagDraft('');
    if (!space) setOpen(false);
  };

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || tags.includes(tag) || tags.length >= 5) return;
    setTags((prev) => [...prev, tag]);
    setTagDraft('');
  };

  if (space?.kind === 'announcements' && !isAdmin) return null;

  const onPickFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);
    if (result.error) setUploadError(result.error);
    else setImage(result.url ?? null);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const placeholder = isIntro
    ? INTRO_TEMPLATE.replace('Soy …', `Soy ${userName?.split(' ')[0] ?? '…'}`)
    : current?.kind === 'announcements'
      ? 'Escribe el anuncio para toda la comunidad…'
      : `Comparte algo en ${current?.name ?? 'la comunidad'}…`;

  return (
    <form
      ref={formRef}
      action={formAction}
      onFocus={() => setOpen(true)}
      className="rounded-[22px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]"
    >
      <input type="hidden" name="space" value={slug} />
      <input type="hidden" name="image" value={image ?? ''} />
      <input type="hidden" name="tags" value={tags.join(',')} />

      {open && (
        <input
          name="title"
          maxLength={120}
          placeholder={isIntro ? 'Un título para tu presentación (opcional)' : 'Título (opcional)'}
          className="mb-2 w-full bg-transparent font-display text-[18px] font-semibold text-[var(--text)] outline-none placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:text-[var(--text-faint)]"
        />
      )}

      <textarea
        name="content"
        rows={open ? (isIntro ? 6 : 4) : 2}
        maxLength={4000}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-[var(--text)] outline-none placeholder:whitespace-pre-line placeholder:text-[var(--text-faint)]"
      />

      {image && (
        <div className="relative mt-2 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img src={image} alt="Vista previa de la imagen" className="max-h-[380px] w-full object-cover" />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Quitar imagen"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
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

      {open && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--brand)]" title="Quitar">
                #{t} <IconX className="h-3 w-3" />
              </button>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagDraft);
                }
              }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder={tags.length ? 'Otra etiqueta…' : 'Etiquetas: tiktok, primera venta… (Enter para agregar)'}
              className="min-w-[200px] flex-1 bg-transparent px-1 py-1 text-[12.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />
          </div>
          {tags.length < 5 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map((t) => (
                <button key={t} type="button" onClick={() => addTag(t)} className="rounded-full px-2 py-0.5 text-[11.5px] text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--brand)]">
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--brand)] disabled:opacity-60"
          >
            <IconImage className="h-4 w-4" />
            {uploading ? 'Subiendo…' : 'Foto'}
          </button>

          {space ? (
            <span className="rounded-full bg-[var(--violet-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--brand)]">
              {space.emoji} {space.name}
            </span>
          ) : (
            <label className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)]">
              Publicar en
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-transparent font-semibold text-[var(--brand)] outline-none"
              >
                {available.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.emoji} {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="ml-auto">
            <Submit disabled={uploading} label={isIntro ? 'Presentarme' : 'Publicar'} />
          </div>
        </div>
      )}

      {(error || uploadError) && (
        <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
          {error || uploadError}
        </p>
      )}
    </form>
  );
}
