'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPost } from '@/app/(app)/comunidade/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { avatarColor, initials, normalizeTag, SUGGESTED_TAGS, type Space } from '@/lib/community';
import { Avatar } from './avatar';
import { IconImage, IconX } from './icons';

function Submit({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-xl bg-[var(--text)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--bg-elevated)] transition hover:opacity-90 disabled:opacity-60"
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
 * Compositor no estilo do Circle: recolhido é uma linha com avatar e
 * "Escribe una publicación…"; ao clicar, abre título, texto, etiquetas e foto.
 */
export function PostComposer({
  spaces,
  space,
  user,
  forceOpen = false,
}: {
  spaces: Space[];
  /** Espaço fixo (página de espaço). */
  space?: Space;
  user: { name: string; avatar?: string; isAdmin: boolean };
  forceOpen?: boolean;
}) {
  const available = spaces.filter((s) => s.kind !== 'chat' && (s.kind !== 'announcements' || user.isAdmin));
  const [slug, setSlug] = useState(space?.slug ?? available.find((s) => s.kind === 'posts')?.slug ?? 'trafico');
  const [open, setOpen] = useState(forceOpen);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = spaces.find((s) => s.slug === slug);
  const isIntro = current?.kind === 'intro';

  if (space?.kind === 'announcements' && !user.isAdmin) return null;

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
    setOpen(forceOpen);
  };

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || tags.includes(tag) || tags.length >= 5) return;
    setTags((prev) => [...prev, tag]);
    setTagDraft('');
  };

  const onPickFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);
    if (result.error) setError(result.error);
    else setImage(result.url ?? null);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const avatar = (
    <Avatar name={user.name} src={user.avatar} size={36} color={avatarColor(user.name)} fallback={initials(user.name)} />
  );

  if (!open) {
    return (
      <button
        type="button"
        id="composer"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[22px] bg-[var(--bg-elevated)] px-5 py-4 text-left shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]"
      >
        {avatar}
        <span className="flex-1 text-[15px] text-[var(--text-faint)]">
          {isIntro ? 'Preséntate a la comunidad…' : 'Escribe una publicación…'}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-sunken)] text-[20px] leading-none text-[var(--text-muted)]" aria-hidden>+</span>
      </button>
    );
  }

  const input = 'w-full bg-transparent outline-none placeholder:text-[var(--text-faint)]';

  return (
    <form
      ref={formRef}
      id="composer"
      action={formAction}
      className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lift)]"
    >
      <input type="hidden" name="space" value={slug} />
      <input type="hidden" name="image" value={image ?? ''} />
      <input type="hidden" name="tags" value={tags.join(',')} />

      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[var(--text)]">{user.name}</p>
          {space ? (
            <p className="text-[12.5px] text-[var(--text-muted)]">en {space.emoji} {space.name}</p>
          ) : (
            <label className="text-[12.5px] text-[var(--text-muted)]">
              en{' '}
              <select value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-transparent font-semibold text-[var(--brand)] outline-none">
                {available.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!forceOpen && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-faint)] hover:bg-[var(--bg-sunken)]">
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        name="title"
        maxLength={120}
        autoFocus
        placeholder={isIntro ? 'Un título para tu presentación (opcional)' : 'Título'}
        className={`${input} mt-4 font-display text-[22px] font-semibold text-[var(--text)] placeholder:font-sans placeholder:text-[17px] placeholder:font-normal`}
      />
      <textarea
        name="content"
        rows={isIntro ? 7 : 5}
        maxLength={4000}
        placeholder={isIntro ? INTRO_TEMPLATE.replace('Soy …', `Soy ${user.name.split(' ')[0]}`) : current?.kind === 'announcements' ? 'Escribe el anuncio para toda la comunidad…' : 'Escribe aquí…'}
        className={`${input} mt-2 resize-none text-[15px] leading-relaxed text-[var(--text)] placeholder:whitespace-pre-line`}
      />

      {image && (
        <div className="relative mt-2 overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
          <img src={image} alt="Vista previa" className="max-h-[380px] w-full object-cover" />
          <button type="button" onClick={() => setImage(null)} aria-label="Quitar imagen" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white">
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFile(f); }} />

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
        {tags.map((t) => (
          <button key={t} type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} title="Quitar" className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--brand)]">
            #{t} <IconX className="h-3 w-3" />
          </button>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagDraft); } }}
          onBlur={() => tagDraft && addTag(tagDraft)}
          placeholder={tags.length ? 'Otra etiqueta…' : 'Etiquetas (Enter para agregar)'}
          className={`${input} min-w-[180px] flex-1 px-1 py-1 text-[12.5px] text-[var(--text)]`}
        />
      </div>
      {tags.length < 5 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map((t) => (
            <button key={t} type="button" onClick={() => addTag(t)} className="rounded-full px-2 py-0.5 text-[11.5px] text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--brand)]">#{t}</button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--brand)] disabled:opacity-60">
          <IconImage className="h-4 w-4" />
          {uploading ? 'Subiendo…' : 'Foto'}
        </button>
        <div className="ml-auto">
          <Submit disabled={uploading} label={isIntro ? 'Presentarme' : 'Publicar'} />
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
