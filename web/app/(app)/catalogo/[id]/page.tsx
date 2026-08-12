import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchProduct, formatCompact, formatPrice } from '@/lib/api';
import { CATEGORY_LABEL, MARKETPLACE_BY_ID } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { CopyLinkButton } from '@/components/copy-link-button';
import {
  IconArrowLeft,
  IconExternal,
  IconFlame,
  IconStar,
  IconStore,
  IconTruck,
} from '@/components/icons';

// Next 16: params é uma Promise e precisa de await.
type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const product = await fetchProduct(id).catch(() => null);
  return { title: product ? `${product.name} · Liberdade Academy` : 'Produto' };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = await fetchProduct(id).catch(() => null);
  if (!product) notFound();

  const marketplace = MARKETPLACE_BY_ID[product.marketplace];
  const rate = product.commission ?? product.commissionEstimated;
  const isEstimate = product.commission == null && product.commissionEstimated != null;

  return (
    <>
      <PageHeader title="Produto" subtitle={marketplace.label} />

      <div className="px-5 pb-12 sm:px-8">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <IconArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Coluna principal */}
          <div className="flex flex-col gap-5">
            <div className="grid gap-5 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)] sm:grid-cols-[280px_minmax(0,1fr)]">
              <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[var(--bg-sunken)]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="280px"
                  className="object-cover"
                  unoptimized
                />
                {product.isViral && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-[var(--color-gold-400)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink-900)]">
                    <IconFlame className="h-3 w-3" />
                    Viral
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: marketplace.color }}
                  >
                    {marketplace.label}
                  </span>
                  <span className="rounded-md bg-[var(--violet-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--brand)]">
                    {CATEGORY_LABEL[product.category] ?? product.category}
                  </span>
                </div>

                <h2 className="font-display text-[22px] font-semibold leading-tight text-[var(--text)]">
                  {product.name}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--text-muted)]">
                  {product.rating > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconStar className="h-4 w-4 text-[var(--color-gold-400)]" />
                      <strong className="font-semibold text-[var(--text)]">
                        {product.rating.toFixed(1).replace('.', ',')}
                      </strong>
                    </span>
                  )}
                  {product.salesCount > 0 && (
                    <span>{formatCompact(product.salesCount)} vendidos</span>
                  )}
                  {product.tiktokViews != null && (
                    <span>{formatCompact(product.tiktokViews)} views</span>
                  )}
                </div>

                <div className="mt-auto">
                  <p className="text-[12.5px] text-[var(--text-faint)]">Preço no marketplace</p>
                  <p className="font-display text-[30px] font-bold leading-tight tracking-tight text-[var(--text)]">
                    {formatPrice(product.price, product.currency)}
                  </p>
                </div>
              </div>
            </div>

            <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">
                Descrição
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
                {product.description}
              </p>
            </section>

            <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
              <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">
                Fornecedor
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--violet-soft)] text-[var(--brand)]">
                  <IconStore className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold text-[var(--text)]">
                    {product.supplier}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-muted)]">
                    <IconTruck className="h-3.5 w-3.5" />
                    {product.supplierShips
                      ? 'Envio direto ao cliente — sem estoque'
                      : 'Entrega digital'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Coluna de ação */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-[24px] bg-[image:var(--sidebar-bg)] p-5 text-white shadow-[var(--shadow-lift)]">
              <p className="text-[12.5px] font-medium uppercase tracking-wider text-white/60">
                Sua comissão
              </p>

              {product.commissionValue != null && rate != null ? (
                <>
                  <p className="mt-1 font-display text-[32px] font-bold leading-tight">
                    {formatPrice(product.commissionValue, product.currency)}
                  </p>
                  <p className="text-[13.5px] text-white/70">
                    {rate}% sobre {formatPrice(product.price, product.currency)}
                  </p>
                  {isEstimate && (
                    <p className="mt-3 rounded-xl bg-white/12 px-3 py-2 text-[11.5px] leading-relaxed text-white/80">
                      Estimativa pela taxa configurada da categoria. O TikTok Shop não expõe a
                      comissão por produto no Brasil — confirme no Affiliate Center antes de
                      divulgar.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/75">
                  A fonte não informa a taxa desta categoria. Configure em
                  <code className="mx-1 rounded bg-white/12 px-1">COMMISSION_RATES_BR</code>
                  para exibir aqui.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
              {product.productUrl ? (
                <>
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]"
                  >
                    Abrir no {marketplace.label}
                    <IconExternal className="h-4 w-4" />
                  </a>
                  <CopyLinkButton url={product.productUrl} />
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-muted)]">
                  Este produto não tem link de origem registrado.
                </p>
              )}

              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-faint)]">
                O link de afiliado com o seu código sai quando a integração de credenciais
                estiver pronta. Por enquanto o botão leva ao produto original.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
