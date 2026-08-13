'use client';

/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPost, type ComposerState } from '@/app/(app)/comunidade/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { POST_CATEGORIES } from '@/lib/community';
import { IconImage, IconX } from './icons';

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Publicando…' : 'Publicar'}
    </button>
  );
}

export function PostComposer() {
  const [state, formAction] = useActionState<ComposerState, FormData>(createPost, {});
  const [category, setCategory] = useState('dica');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // limpa tudo só quando o servidor confirma a publicação
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setImage(null);
    }
  }, [state.ok]);

  const onPickFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    const body = new FormData();
    body.append('file', file);
    // mesma rota de upload do avatar
    const result = await uploadAvatar(body);

    if (result.error) setUploadError(result.error);
    else setImage(result.url ?? null);

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[22px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]"
    >
      <textarea
        name="content"
        rows={3}
        maxLength={2000}
        placeholder="Comparte un consejo, un resultado o haz una pregunta…"
        className="w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
      />

      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="image" value={image ?? ''} />

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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Agregar foto"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--brand)] disabled:opacity-60"
        >
          <IconImage className="h-4 w-4" />
          {uploading ? 'Subiendo…' : 'Foto'}
        </button>

        {POST_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            aria-pressed={category === cat.id}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
              category === cat.id
                ? cat.className
                : 'bg-[var(--bg-sunken)] text-[var(--text-faint)] hover:text-[var(--text-muted)]'
            }`}
          >
            {cat.label}
          </button>
        ))}

        <div className="ml-auto">
          <Submit disabled={uploading} />
        </div>
      </div>

      {(state.error || uploadError) && (
        <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">
          {state.error || uploadError}
        </p>
      )}
    </form>
  );
}
