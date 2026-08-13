import Image from 'next/image';
import Link from 'next/link';
import { formatCompact, formatPrice } from '@/lib/api';
import { CATEGORY_LABEL, MARKETPLACE_BY_ID, type Product } from '@/lib/types';
import { IconFlame, IconStar } from './icons';

export function ProductCard({ product }: { product: Product }) {
  const marketplace = MARKETPLACE_BY_ID[product.marketplace];
  const rate = product.commission ?? product.commissionEstimated;
  const isEstimate = product.commission == null && product.commissionEstimated != null;

  return (
    <Link
      href={`/catalogo/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-[22px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative m-2 aspect-square overflow-hidden rounded-[16px] bg-[var(--bg-sunken)]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
          className="object-cover transition duration-300 group-hover:scale-[1.04]"
          unoptimized
        />

        <span
          className="absolute left-2.5 top-2.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
          style={{ backgroundColor: marketplace.color }}
        >
          {marketplace.label}
        </span>

        {product.isViral && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-[var(--color-gold-400)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-ink-900)] shadow-sm">
            <IconFlame className="h-3 w-3" />
            Viral
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-1">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--text)]">
          {product.name}
        </h3>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-md bg-[var(--violet-soft)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--brand)]">
            {CATEGORY_LABEL[product.category] ?? product.category}
          </span>
          {product.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--text-muted)]">
              <IconStar className="h-3 w-3 text-[var(--color-gold-400)]" />
              {product.rating.toFixed(1).replace('.', ',')}
            </span>
          )}
          {product.salesCount > 0 && (
            <span className="text-[11.5px] text-[var(--text-faint)]">
              {formatCompact(product.salesCount)} vendidos
            </span>
          )}
        </div>

        <div className="mt-auto pt-1">
          <p className="text-[12px] text-[var(--text-faint)]">Precio</p>
          <p className="text-[17px] font-bold leading-tight tracking-tight text-[var(--text)]">
            {formatPrice(product.price, product.currency)}
          </p>

          {product.commissionValue != null && rate != null ? (
            <p className="mt-1 text-[13px] font-semibold text-[var(--money)]">
              Comisión: {formatPrice(product.commissionValue, product.currency)}{' '}
              <span className="font-medium opacity-75">({rate}%)</span>
              {isEstimate && (
                <span
                  className="ml-1 cursor-help font-medium text-[var(--text-faint)]"
                  title="Porcentaje configurado por categoría — la fuente de TikTok Shop no informa la tasa por producto."
                >
                  est.
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-[var(--text-faint)]">Comisión no informada</p>
          )}
        </div>

        <span className="mt-1 inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2.5 text-[13px] font-semibold text-white transition group-hover:bg-[var(--brand-hover)]">
          Promocionar este producto
        </span>
      </div>
    </Link>
  );
}
