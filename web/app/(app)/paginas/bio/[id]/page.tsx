import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { BioEditor } from '@/components/bio/bio-editor';
import { CopyLinkButton } from '@/components/copy-link-button';
import { deletePage, togglePublish } from '@/app/(app)/paginas/actions';
import { getUserId } from '@/lib/session';
import { listPages } from '@/lib/queries';
import type { LandingPage } from '@/lib/pages';
import { IconArrowLeft, IconExternal, IconX } from '@/components/icons';

type Params = Promise<{ id: string }>;

export default async function BioEditorPage({ params }: { params: Params }) {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const { id } = await params;
  const pages = (await listPages(userId, 'bio').catch(() => [])) as LandingPage[];
  const page = pages.find((p) => p.id === id);
  if (!page) notFound();

  return (
    <>
      <PageHeader title="Editar Bio" />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <Link
          href="/paginas/bio"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <IconArrowLeft className="h-4 w-4" />
          Mis bios
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-[var(--bg-elevated)] px-5 py-4 shadow-[var(--shadow-soft)]">
          <span
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
              page.published
                ? 'bg-[var(--money-soft)] text-[var(--money)]'
                : 'bg-[var(--bg-sunken)] text-[var(--text-faint)]'
            }`}
          >
            {page.published ? 'Publicada' : 'Borrador'}
          </span>

          <code className="rounded-lg bg-[var(--bg-sunken)] px-2.5 py-1 text-[12.5px] text-[var(--text-muted)]">
            /bio/{page.slug}
          </code>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <CopyLinkButton url={`/bio/${page.slug}`} />

            {page.published && (
              <a
                href={`/bio/${page.slug}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
              >
                Abrir
                <IconExternal className="h-3.5 w-3.5" />
              </a>
            )}

            <form action={deletePage}>
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="kind" value="bio" />
              <button
                type="submit"
                aria-label="Eliminar bio"
                className="grid h-9 w-9 place-items-center rounded-xl text-[var(--text-faint)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <IconX className="h-4 w-4" />
              </button>
            </form>

            <form action={togglePublish}>
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="published" value={String(!page.published)} />
              <button
                type="submit"
                className={`rounded-xl px-5 py-2.5 text-[13.5px] font-semibold transition ${
                  page.published
                    ? 'border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)]'
                    : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                }`}
              >
                {page.published ? 'Despublicar' : 'Publicar'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-5">
          <BioEditor page={page} />
        </div>
      </div>
    </>
  );
}
