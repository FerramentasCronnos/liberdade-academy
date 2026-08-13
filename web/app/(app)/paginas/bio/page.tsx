import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { createPage } from '@/app/(app)/paginas/actions';
import { BioRender } from '@/components/bio/bio-render';
import { apiFetch, getToken } from '@/lib/session';
import { BIO_MODELS, type LandingPage } from '@/lib/pages';

export const metadata = { title: 'Página para BIO · Liberdade Academy' };

export default async function BioListPage() {
  if (!(await getToken())) redirect('/login');

  const data = await apiFetch<{ pages: LandingPage[] }>('/pages?kind=bio').catch(() => null);
  const pages = data?.pages ?? [];

  return (
    <>
      <PageHeader
        title="Página para BIO"
        subtitle="Reúna seus links num endereço só para colocar na bio"
      />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <section className="rounded-[24px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-[17px] font-semibold text-[var(--text)]">
            Escolha um modelo
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            Selecione um modelo e veja o preview. Dá para mudar tudo depois.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {BIO_MODELS.map((model) => (
              <form key={model.id} action={createPage} className="flex flex-col">
                <input type="hidden" name="kind" value="bio" />
                <input type="hidden" name="template" value={model.id} />
                <input type="hidden" name="title" value="Minha Bio" />
                <input type="hidden" name="config" value={JSON.stringify(model.config)} />

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="h-[230px] overflow-hidden">
                    <BioRender
                      data={{
                        title: 'Minha Bio',
                        subtitle: 'Aqui você encontra as melhores ofertas!',
                        config: model.config,
                      }}
                      scale={0.68}
                    />
                  </div>
                </div>

                <p className="mt-2.5 font-display text-[14.5px] font-semibold text-[var(--text)]">
                  {model.label}
                </p>
                <p className="text-[12.5px] text-[var(--text-muted)]">{model.description}</p>

                <button
                  type="submit"
                  className="mt-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
                >
                  Criar bio
                </button>
              </form>
            ))}
          </div>
        </section>

        {pages.length > 0 && (
          <>
            <h2 className="mt-8 text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
              Minhas bios
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border)] rounded-[22px] bg-[var(--bg-elevated)] px-5 shadow-[var(--shadow-soft)]">
              {pages.map((page) => (
                <li key={page.id} className="flex items-center gap-3 py-3.5">
                  <Link href={`/paginas/bio/${page.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--text)]">
                      {page.title}
                    </p>
                    <p className="text-[12px] text-[var(--text-faint)]">
                      /bio/{page.slug} · {page.views} visitas
                    </p>
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
                      page.published
                        ? 'bg-[var(--money-soft)] text-[var(--money)]'
                        : 'bg-[var(--bg-sunken)] text-[var(--text-faint)]'
                    }`}
                  >
                    {page.published ? 'Publicada' : 'Rascunho'}
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
