'use client';

/* eslint-disable @next/next/no-img-element */

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { countDownload, createAd, deleteAd, type AdState } from '@/app/(app)/anuncios/actions';
import { uploadAvatar } from '@/app/(app)/perfil/actions';
import { IconCheck, IconUpload, IconX } from './icons';

export interface AdCreative {
  id: string;
  title: string;
  category: string;
  image: string;
  notes?: string;
  downloads: number;
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  geral: 'Geral',
  beleza: 'Beleza',
  saude: 'Saúde',
  fitness: 'Fitness',
  moda: 'Moda',
  casa: 'Casa',
  tech: 'Tech',
};

const input =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]';

function PublishButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
    >
      {pending ? 'Publicando…' : 'Publicar no baú'}
    </button>
  );
}

function AdCard({ ad, isAdmin }: { ad: AdCreative; isAdmin: boolean }) {
  const [saved, setSaved] = useState(false);

  /** Baixa via blob para forçar o download em vez de abrir a imagem na aba. */
  const download = async () => {
    void countDownload(ad.id);

    try {
      const response = await fetch(ad.image);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${ad.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`;
      anchor.click();

      URL.revokeObjectURL(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      window.open(ad.image, '_blank');
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-[22px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
      <div className="relative m-2 overflow-hidden rounded-[16px] bg-[var(--bg-sunken)]">
        <img src={ad.image} alt={ad.title} className="h-full w-full object-cover" />

        <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {CATEGORY_LABEL[ad.category] ?? ad.category}
        </span>

        {isAdmin && (
          <form action={deleteAd} className="absolute right-2.5 top-2.5">
            <input type="hidden" name="id" value={ad.id} />
            <button
              type="submit"
              aria-label={`Excluir ${ad.title}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-red-600"
            >
              <IconX className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4">
        <h3 className="text-[14px] font-semibold leading-snug text-[var(--text)]">{ad.title}</h3>

        {ad.notes && (
          <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">{ad.notes}</p>
        )}

        <p className="text-[11.5px] text-[var(--text-faint)]">
          {ad.downloads} {ad.downloads === 1 ? 'download' : 'downloads'}
        </p>

        <button
          type="button"
          onClick={download}
          className="mt-auto rounded-xl bg-[var(--brand)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
        >
          {saved ? 'Baixado!' : 'Baixar imagem'}
        </button>
      </div>
    </article>
  );
}

export function AdVault({
  ads,
  isAdmin,
  categories,
  activeCategory,
}: {
  ads: AdCreative[];
  isAdmin: boolean;
  categories: readonly string[];
  activeCategory: string;
}) {
  const [state, formAction] = useActionState<AdState, FormData>(createAd, {});
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onPickFile = async (file: File) => {
    setUploading(true);
    const body = new FormData();
    body.append('file', file);
    const result = await uploadAvatar(body);
    if (result.url) setImage(result.url);
    setUploading(false);
  };

  if (state.ok && image) {
    // limpa depois de publicar, para não republicar a mesma imagem sem querer
    formRef.current?.reset();
    setImage(null);
  }

  return (
    <>
      {isAdmin && (
        <form
          ref={formRef}
          action={formAction}
          className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]"
        >
          <h2 className="font-display text-[16px] font-semibold text-[var(--text)]">
            Publicar anúncio
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
            Visível só para você, que é administradora. Os membros veem apenas o baú.
          </p>

          <input type="hidden" name="image" value={image ?? ''} />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPickFile(file);
            }}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
            {image ? (
              <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-sunken)]">
                <img src={image} alt="" className="h-[150px] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  aria-label="Remover imagem"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60"
              >
                <IconUpload className="h-5 w-5" />
                {uploading ? 'Enviando…' : 'Escolher imagem'}
              </button>
            )}

            <div className="flex flex-col gap-2">
              <input name="title" placeholder="Nome do anúncio" className={input} />
              <select name="category" className={input}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABEL[category] ?? category}
                  </option>
                ))}
              </select>
              <input name="notes" placeholder="Observação (opcional)" className={input} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <PublishButton />
            {state.error && (
              <span role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">
                {state.error}
              </span>
            )}
            {state.ok && (
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--money)]">
                <IconCheck className="h-4 w-4" />
                Publicado.
              </span>
            )}
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {['todos', ...categories].map((category) => (
          <a
            key={category}
            href={`?categoria=${category}`}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold shadow-[var(--shadow-soft)] transition ${
              activeCategory === category
                ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
            }`}
          >
            {category === 'todos' ? 'Todos' : (CATEGORY_LABEL[category] ?? category)}
          </a>
        ))}
      </div>

      {ads.length === 0 ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center">
          <p className="font-display text-lg font-semibold text-[var(--text)]">Baú vazio</p>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
            {isAdmin
              ? 'Publique o primeiro anúncio acima.'
              : 'Nenhum anúncio publicado nesta categoria ainda.'}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </>
  );
}
