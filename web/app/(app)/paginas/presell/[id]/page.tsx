import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PresellEditor } from '@/components/presell/presell-editor';
import { PresellGroups } from '@/components/presell/presell-groups';
import { PresellStats, type StatsData } from '@/components/presell/presell-stats';
import { deletePage, togglePublish } from '@/app/(app)/paginas/actions';
import { apiFetch, getToken } from '@/lib/session';
import type { LandingPage } from '@/lib/pages';
import { IconArrowLeft, IconExternal, IconX } from '@/components/icons';

type Params = Promise<{ id: string }>;
type Search = Promise<{ tab?: string; range?: string }>;

const TABS = [
  { id: 'page', label: 'Página' },
  { id: 'group', label: 'Grupo' },
  { id: 'stats', label: 'Estatísticas' },
];

export default async function PresellEditorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  if (!(await getToken())) redirect('/login');

  const { id } = await params;
  const { tab = 'page', range = '7d' } = await searchParams;

  const data = await apiFetch<{ pages: LandingPage[] }>('/pages?kind=presell').catch(() => null);
  const page = data?.pages.find((p) => p.id === id);
  if (!page) notFound();

  const stats =
    tab === 'stats'
      ? await apiFetch<StatsData>(`/pages/${id}/stats?range=${range}`).catch(() => null)
      : null;

  return (
    <>
      <PageHeader title="Página de Presell" />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <Link
          href="/paginas/presell"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <IconArrowLeft className="h-4 w-4" />
          Minhas páginas
        </Link>

        {/* Barra de status */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-[var(--bg-elevated)] px-5 py-4 shadow-[var(--shadow-soft)]">
          <span
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
              page.published
                ? 'bg-[var(--money-soft)] text-[var(--money)]'
                : 'bg-[var(--bg-sunken)] text-[var(--text-faint)]'
            }`}
          >
            {page.published ? 'Publicada' : 'Rascunho'}
          </span>

          <code className="rounded-lg bg-[var(--bg-sunken)] px-2.5 py-1 text-[12.5px] text-[var(--text-muted)]">
            /p/{page.slug}
          </code>

          {page.published && (
            <a
              href={`/p/${page.slug}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand)] transition hover:underline"
            >
              Abrir
              <IconExternal className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="ml-auto flex items-center gap-2">
            <form action={deletePage}>
              <input type="hidden" name="id" value={page.id} />
              <input type="hidden" name="kind" value="presell" />
              <button
                type="submit"
                aria-label="Excluir página"
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

        {/* Abas */}
        <div className="mt-4 inline-flex gap-1 rounded-full bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-soft)]">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={`?tab=${item.id}`}
              scroll={false}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                tab === item.id
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'page' && <PresellEditor page={page} />}
          {tab === 'group' && <PresellGroups page={page} />}
          {tab === 'stats' &&
            (stats ? (
              <PresellStats stats={stats} pageId={page.id} slug={page.slug} range={range} />
            ) : (
              <p className="text-[13.5px] text-[var(--text-muted)]">
                Não consegui carregar as estatísticas.
              </p>
            ))}
        </div>
      </div>
    </>
  );
}
