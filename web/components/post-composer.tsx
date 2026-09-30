'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPost } from '@/app/(app)/comunidade/actions';
import { upload } from '@vercel/blob/client';
import { avatarColor, initials, normalizeTag, SUGGESTED_TAGS, type Space } from '@/lib/community';
import { Avatar } from './avatar';
import { PostCard } from './post-card';
import type { CommunityPost } from '@/lib/community';
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
  const [notify, setNotify] = useState(true);
  const [preview, setPreview] = useState<{ title: string; content: string; link: string; pinned: boolean } | null>(null);
  const [scheduleLocal, setScheduleLocal] = useState('');
  const scheduledIso = scheduleLocal ? new Date(scheduleLocal).toISOString() : '';
  const scheduleLabel = scheduleLocal
    ? new Date(scheduleLocal).toLocaleString('es-419', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
  const [publishing, setPublishing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = spaces.find((s) => s.slug === slug);
  const isIntro = current?.kind === 'intro';
  const isAnnouncement = current?.kind === 'announcements';

  if (space?.kind === 'announcements' && !user.isAdmin) return null;

  // Anúncio: antes de publicar, mostra como vai ficar e o que vai acontecer.
  const openPreview = () => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    const content = String(fd.get('content') || '').trim();
    const link = String(fd.get('link') || '').trim();
    if (title.length < 3) {
      setError('El anuncio necesita un título.');
      return;
    }
    if (content.length < 3 && !image) {
      setError('Escribe el contenido del anuncio.');
      return;
    }
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setError('El enlace debe empezar con http:// o https://.');
      return;
    }
    if (scheduleLocal && new Date(scheduleLocal).getTime() < Date.now()) {
      setError('La fecha de programación ya pasó.');
      return;
    }
    setError(null);
    setPreview({ title, content, link, pinned: fd.get('pinned') === 'on' });
  };

  const publishFromPreview = () => {
    setPublishing(true);
    formRef.current?.requestSubmit();
  };

  const formAction = async (formData: FormData) => {
    let result: { ok?: boolean; error?: string };
    try {
      result = await createPost({}, formData);
    } catch {
      result = { error: 'No pude publicar ahora. Revisa tu conexión e inténtalo de nuevo.' };
    }
    setPublishing(false);
    if (!result.ok) {
      setPreview(null);
      setError(result.error ?? 'No pude publicar ahora.');
      return;
    }
    setPreview(null);
    setError(null);
    formRef.current?.reset();
    setImage(null);
    setTags([]);
    setTagDraft('');
    setScheduleLocal('');
    setOpen(forceOpen);
  };

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || tags.includes(tag) || tags.length >= 5) return;
    setTags((prev) => [...prev, tag]);
    setTagDraft('');
  };

  // Direto ao Blob, como os anexos: não passa pelo limite de corpo das actions.
  const onPickFile = async (file: File) => {
    setError(null);
    if (file.size > 40 * 1024 * 1024) {
      setError('Imagen mayor a 40 MB.');
      return;
    }
    setUploading(true);
    try {
      const blob = await upload(`posts/${file.name.replace(/[^\w.-]+/g, '_')}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: file.type || undefined,
      });
      setImage(blob.url);
    } catch (e) {
      setError(e instanceof Error ? `No pude subir la imagen: ${e.message}` : 'No pude subir la imagen.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
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
      <input type="hidden" name="scheduledAt" value={scheduledIso} />

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
        placeholder={isIntro ? 'Un título para tu presentación (opcional)' : isAnnouncement ? 'Título del anuncio' : 'Título'}
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

      {isAnnouncement && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-[var(--bg-sunken)] p-3">
          <input
            name="link"
            type="url"
            placeholder="Enlace (opcional): https://…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
          />
          <label className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
            <input type="checkbox" name="pinned" className="h-4 w-4 accent-[var(--brand)]" />
            Fijar arriba del espacio
          </label>
          <label className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
            <input type="checkbox" name="notify" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            Avisar a todos los miembros por correo
          </label>
          <label className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[var(--text)]">
            🗓️ Programar para
            <input
              type="datetime-local"
              value={scheduleLocal}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduleLocal(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
            />
            {scheduleLocal ? (
              <button type="button" onClick={() => setScheduleLocal('')} className="text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">Quitar</button>
            ) : (
              <span className="text-[12px] font-normal text-[var(--text-muted)]">vacío = publicar ahora</span>
            )}
          </label>
          <p className="text-[12px] text-[var(--text-muted)]">
            {notify
              ? '📣 Al publicar, cada miembro recibe un correo con el título, la portada y el enlace al anuncio.'
              : 'Solo se publica en el espacio. Nadie recibe correo.'}{' '}
            Los anuncios no tienen comentarios, solo reacciones.
          </p>
        </div>
      )}

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
          {uploading ? 'Subiendo…' : isAnnouncement ? 'Portada' : 'Foto'}
        </button>
        <div className="ml-auto">
          {isAnnouncement ? (
            <button
              type="button"
              onClick={openPreview}
              disabled={uploading}
              className="rounded-xl bg-[var(--text)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--bg-elevated)] transition hover:opacity-90 disabled:opacity-60"
            >
              Vista previa
            </button>
          ) : (
            <Submit disabled={uploading} label={isIntro ? 'Presentarme' : 'Publicar'} />
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>}

      {preview && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
          <div role="dialog" aria-modal="true" className="flex max-h-[94dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[26px] bg-[var(--bg)] shadow-[var(--shadow-lift)] sm:rounded-[26px]">
            <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-4">
              <div className="flex-1">
                <h2 className="font-display text-[20px] font-semibold text-[var(--text)]">Así verán el anuncio</h2>
                <p className="text-[12.5px] text-[var(--text-muted)]">Revisa todo antes de publicar.</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-faint)] hover:bg-[var(--bg-sunken)]">
                <IconX className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto p-5">
              <PostCard
                preview
                post={{
                  id: 'preview',
                  author: { id: 'me', name: user.name, avatar: user.avatar, level: 1, isAdmin: true },
                  title: preview.title,
                  content: preview.content,
                  image: image ?? undefined,
                  pinned: preview.pinned,
                  likes: 0,
                  comments: 0,
                  isLiked: false,
                  createdAt: new Date().toISOString(),
                  category: 'dica',
                  tags,
                  attachments: [],
                  link: preview.link || undefined,
                  space: { slug: 'anuncios', name: 'Anuncios', emoji: '📣', kind: 'announcements' },
                } satisfies CommunityPost}
              />

              <ul className="mt-4 grid gap-2 rounded-2xl bg-[var(--bg-elevated)] p-4 text-[13.5px] text-[var(--text)] shadow-[var(--shadow-soft)] sm:grid-cols-2">
                <li>🖼️ Portada: <strong>{image ? 'sí' : 'sin portada'}</strong></li>
                <li>🔗 Enlace: <strong className="break-all">{preview.link || 'ninguno'}</strong></li>
                <li>📌 Fijado arriba: <strong>{preview.pinned ? 'sí' : 'no'}</strong></li>
                <li>✉️ Correo a los miembros: <strong>{notify ? 'sí, a todos' : 'no'}</strong></li>
                <li className="sm:col-span-2">🗓️ Publicación: <strong>{scheduleLocal ? `programada para ${scheduleLabel} (tu hora local)` : 'ahora mismo'}</strong></li>
              </ul>
            </div>

            <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-4">
              <button type="button" onClick={() => setPreview(null)} disabled={publishing} className="rounded-xl bg-[var(--bg-sunken)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--text)] transition hover:opacity-90 disabled:opacity-60">
                ← Volver a editar
              </button>
              <button type="button" onClick={publishFromPreview} disabled={publishing} className="ml-auto rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60">
                {publishing ? 'Publicando…' : scheduleLocal ? 'Programar' : notify ? 'Publicar y avisar' : 'Publicar sin avisar'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </form>
  );
}
