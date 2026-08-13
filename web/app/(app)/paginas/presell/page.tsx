import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { createPage } from '@/app/(app)/paginas/actions';
import { getUserId } from '@/lib/session';
import { listPages } from '@/lib/queries';
import { PRESELL_TEMPLATES, type LandingPage } from '@/lib/pages';

export const metadata = { title: 'Página de Presell · Liberdade Academy' };

export default async function PresellListPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const pages = (await listPages(userId, 'presell').catch(() => [])) as LandingPage[];

  return (
    <>
      <PageHeader
        title="Página de Presell"
        subtitle="Captura el clic y distribúyelo entre tus grupos de WhatsApp"
      />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <section className="rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-[17px] font-semibold text-[var(--text)]">
            Elige una plantilla
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            Puedes cambiar la plantilla en cualquier momento.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PRESELL_TEMPLATES.map((template) => (
              <form key={template.id} action={createPage}>
                <input type="hidden" name="kind" value="presell" />
                <input type="hidden" name="template" value={template.id} />
                <button
                  type="submit"
                  className="flex w-full flex-col rounded-2xl border border-[var(--border)] p-4 text-left transition hover:border-[var(--brand)] hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="font-display text-[15px] font-semibold text-[var(--text)]">
                    {template.label}
                  </span>
                  <span className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
                    {template.description}
                  </span>
                  <span className="mt-3 inline-flex w-fit rounded-lg bg-[var(--brand)] px-3 py-1.5 text-[12px] font-semibold text-white">
                    Usar
                  </span>
                </button>
              </form>
            ))}
          </div>
        </section>

        {pages.length > 0 && (
          <>
            <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
              Mis páginas
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
              {pages.map((page) => (
                <li key={page.id} className="flex items-center gap-3 py-3.5">
                  <Link href={`/paginas/presell/${page.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--text)]">
                      {page.title}
                    </p>
                    <p className="text-[12px] text-[var(--text-faint)]">
                      /p/{page.slug} · {page.views} visitas ·{' '}
                      {page.groups?.length ?? 0} grupos
                    </p>
                  </Link>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
                      page.published
                        ? 'bg-[var(--money-soft)] text-[var(--money)]'
                        : 'bg-[var(--bg-sunken)] text-[var(--text-faint)]'
                    }`}
                  >
                    {page.published ? 'Publicada' : 'Borrador'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
