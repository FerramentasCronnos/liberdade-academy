import Link from 'next/link';
import Image from 'next/image';
import { formatCompact, formatPrice } from '@/lib/api';
import type { CreatorDetail, CreatorProductView, CreatorVideoView } from '@/lib/queries';
import { Tabs } from '@/components/tabs';
import { Sparkline } from '@/components/sparkline';
import { CreatorFavoriteButton } from '@/components/creator-favorite-button';
import { VideoPlayer } from '@/components/video-player';
import {
  IconExternal,
  IconHeart,
  IconInstagram,
  IconMessage,
  IconStore,
  IconTikTok,
  IconTrophy,
} from '@/components/icons';

/**
 * Perfil do criador (Creators), modelado na página de criador da Kalodata:
 * cabeçalho com contato, grade de métricas dos últimos 30 dias, tendências e
 * abas de vídeos/produtos/lojas/lives. Tudo vem do banco (sync a cada 2 dias);
 * só as abas são client-side, pelo componente Tabs já existente.
 */
export function CreatorProfile({ creator }: { creator: CreatorDetail }) {
  const currency = creator.currency || 'USD';
  const ads = creator.videos.filter((v) => v.isAd).length;

  return (
    <div className="mt-4 flex flex-col gap-5">
      <Header creator={creator} />
      <Metrics creator={creator} currency={currency} />

      <Tabs
        tabs={[
          {
            id: 'videos',
            label: 'Videos y Ads',
            count: creator.videos.length,
            content: <VideosTab videos={creator.videos} handle={creator.handle} currency={currency} ads={ads} />,
          },
          {
            id: 'products',
            label: 'Productos',
            count: creator.products.length,
            content: <ProductsTab products={creator.products} currency={currency} />,
          },
          { id: 'shops', label: 'Tiendas', content: <ShopsTab creator={creator} /> },
          { id: 'lives', label: 'Lives', content: <LivesTab creator={creator} currency={currency} /> },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------- cabeçalho */

function Header({ creator }: { creator: CreatorDetail }) {
  const contacts = contactLinks(creator);

  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {creator.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatar} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[image:var(--sidebar-bg)] font-display text-[22px] font-bold text-white">
            {initials(creator.nickname || creator.handle)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[22px] font-semibold leading-tight text-[var(--text)]">
              {creator.nickname || `@${creator.handle}`}
            </h2>
            {creator.rank != null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--accent-text)]">
                <IconTrophy className="h-3.5 w-3.5" />#{creator.rank} en ventas
              </span>
            )}
            {creator.status && (
              <span className="rounded-md bg-[var(--violet-soft)] px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--brand)]">
                {creator.status}
              </span>
            )}
          </div>

          <a
            href={`https://www.tiktok.com/@${creator.handle}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:underline"
          >
            <IconTikTok className="h-4 w-4" />@{creator.handle}
            <IconExternal className="h-3.5 w-3.5" />
          </a>

          {creator.bio && (
            <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-[var(--text-muted)]">{creator.bio}</p>
          )}

          {contacts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Contacto</span>
              {contacts.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)]"
                >
                  {c.icon}
                  {c.label}
                </a>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--text-faint)]">
            {creator.debutDate && <span>Creador desde {formatDate(creator.debutDate)}</span>}
            {creator.profileSyncedAt && <span>Actualizado {formatDate(creator.profileSyncedAt.slice(0, 10))}</span>}
            {!creator.profileSyncedAt && creator.rankSyncedAt && (
              <span>Ranking actualizado {formatDate(creator.rankSyncedAt.slice(0, 10))}</span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <CreatorFavoriteButton creatorId={creator.id} favorite={creator.favorite} />
        </div>
      </div>
    </section>
  );
}

function contactLinks(creator: CreatorDetail) {
  const links: Array<{ label: string; href: string; icon: React.ReactNode }> = [];
  if (creator.contactEmail) {
    links.push({ label: 'Email', href: `mailto:${creator.contactEmail}`, icon: <IconMessage className="h-3.5 w-3.5" /> });
  }
  if (creator.contactInstagram) {
    links.push({
      label: 'Instagram',
      href: `https://instagram.com/${creator.contactInstagram.replace(/^@/, '')}`,
      icon: <IconInstagram className="h-3.5 w-3.5" />,
    });
  }
  if (creator.contactWhatsapp) {
    const digits = creator.contactWhatsapp.replace(/\D/g, '');
    if (digits) links.push({ label: 'WhatsApp', href: `https://wa.me/${digits}`, icon: <IconMessage className="h-3.5 w-3.5" /> });
  }
  if (creator.contactFacebook) {
    const fb = creator.contactFacebook;
    links.push({
      label: 'Facebook',
      href: /^https?:\/\//.test(fb) ? fb : `https://facebook.com/${fb.replace(/^@/, '')}`,
      icon: <IconExternal className="h-3.5 w-3.5" />,
    });
  }
  return links;
}

/* -------------------------------------------------------------- métricas */

function Metrics({ creator, currency }: { creator: CreatorDetail; currency: string }) {
  const revenueTrend = creator.trend.map((p) => p.r);
  const viewsTrend = creator.trend.filter((p) => typeof p.v === 'number').map((p) => p.v as number);

  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Principales métricas</h3>
        <p className="text-[11.5px] text-[var(--text-faint)]">Fuente: Kalodata · últimos 30 días</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Stat label="Ingresos" value={formatPrice(creator.revenue, currency)} strong badge={<Growth value={creator.revenueGrowth} />} />
          <Stat label="Ingresos en vivo" value={money(creator.liveRevenue, currency)} />
          <Stat label="Ingresos por video" value={money(creator.videoRevenue, currency)} />
          <Stat label="Precio medio por unidad" value={money(creator.unitPrice, currency)} />
          <Stat label="Visualizaciones de video" value={compact(creator.videoViews)} />
          <Stat label="Visualizaciones en vivo" value={compact(creator.liveViews)} />
          <Stat
            label="Nuevos seguidores"
            value={creator.newFollowers != null ? `+${formatCompact(creator.newFollowers)}` : '—'}
            hint={creator.followers != null ? `${formatCompact(creator.followers)} en total` : undefined}
          />
          <Stat label="GPM video" value={money(creator.videoGpm, currency)} hint="Ingresos por 1.000 views" />
          <Stat label="Tasa de engagement" value={percent(creator.engagementRate)} />
          <Stat label="Unidades vendidas" value={formatCompact(creator.salesCount)} />
          <Stat label="Tiendas" value={compact(creator.shopCount)} />
          <Stat label="Productos" value={compact(creator.productCount ?? (creator.products.length || undefined))} />
        </div>

        <div className="flex flex-col gap-3">
          <TrendCard title="Tendencia de ingresos" points={revenueTrend} />
          <TrendCard title="Tendencia de visualizaciones" points={viewsTrend} />
        </div>
      </div>
    </section>
  );
}

function TrendCard({ title, points }: { title: string; points: number[] }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-sunken)] p-3">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{title}</p>
      <div className="mt-2">
        <Sparkline points={points} width={200} height={56} label={title} className="max-w-full" />
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">
        {points.length < 3 ? 'Se dibuja con cada actualización (cada 2 días)' : `${points.length} puntos de historial`}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
  hint,
  badge,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hint?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[var(--bg-sunken)] px-3 py-2.5">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <p className={`${strong ? 'text-[22px]' : 'text-[17px]'} font-semibold leading-tight tracking-tight tabular-nums text-[var(--text)]`}>{value}</p>
        {badge}
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">{hint}</p>}
    </div>
  );
}

function Growth({ value }: { value?: number }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
        up ? 'bg-[var(--money-soft)] text-[var(--money)]' : 'bg-[#fdecec] text-[#d64545]'
      }`}
    >
      {up ? '+' : ''}
      {value.toFixed(1).replace('.', ',')}%
    </span>
  );
}

/* ---------------------------------------------------------- aba: vídeos */

function VideosTab({
  videos,
  handle,
  currency,
  ads,
}: {
  videos: CreatorVideoView[];
  handle: string;
  currency: string;
  ads: number;
}) {
  return (
    <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Videos y Ads</h3>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            Los videos que más vendieron en los últimos 30 días. Toca la portada para reproducir.
          </p>
        </div>
        <p className="text-[11.5px] text-[var(--text-faint)]">
          {videos.length} videos · {ads} con anuncio
        </p>
      </div>

      {videos.length === 0 ? (
        <Empty>Los videos llegan con la próxima actualización del perfil.</Empty>
      ) : (
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <li key={video.id} className="flex flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-4">
              <VideoPlayer
                videoId={video.videoId}
                title={video.title || `Video de @${handle}`}
                cover={video.thumbnail}
                fallbackLabel={`@${handle}`}
              />

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {video.isAd && (
                  <span className="rounded-md bg-[var(--violet-soft)] px-2 py-0.5 font-bold uppercase tracking-wide text-[var(--brand)]">Ad</span>
                )}
                {video.isAd && video.adsRoas != null && (
                  <span className="rounded-md bg-[var(--money-soft)] px-2 py-0.5 font-bold text-[var(--money)]">
                    ROAS {video.adsRoas.toFixed(1).replace('.', ',')}x
                  </span>
                )}
                {video.publishedAt && <span className="text-[var(--text-faint)]">{formatDate(video.publishedAt)}</span>}
              </div>

              {video.title && <p className="line-clamp-2 text-[13px] leading-snug text-[var(--text-muted)]">{video.title}</p>}

              <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <MiniStat label="Ventas est." value={formatPrice(video.revenue, currency)} />
                <MiniStat label="Views" value={formatCompact(video.views)} />
                <MiniStat label="Likes" value={formatCompact(video.likes)} icon={<IconHeart className="h-3 w-3" />} />
                <MiniStat label="Comentarios" value={formatCompact(video.comments)} />
              </dl>

              <a
                href={video.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-ink-900)] px-3 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
              >
                Ver en TikTok
                <IconExternal className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--bg-sunken)] px-2 py-2">
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</dt>
      <dd className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text)]">
        {icon}
        {value}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------- aba: produtos */

function ProductsTab({ products, currency }: { products: CreatorProductView[]; currency: string }) {
  return (
    <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Productos</h3>
      <p className="mt-1 text-[13px] text-[var(--text-muted)]">
        Productos que este creador vendió en los últimos 30 días (Kalodata)
      </p>

      {products.length === 0 ? (
        <Empty>Los productos llegan con la próxima actualización del perfil.</Empty>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
                  <th className="pb-2 pr-3 font-medium">Producto</th>
                  <th className="pb-2 pr-3 text-right font-medium">Ingresos</th>
                  <th className="pb-2 pr-3 text-right font-medium">Crecimiento</th>
                  <th className="pb-2 pr-3 text-right font-medium">Vendidos</th>
                  <th className="pb-2 pr-3 text-right font-medium">Precio medio</th>
                  <th className="pb-2 pr-3 text-right font-medium">Comisión</th>
                  <th className="pb-2 text-right font-medium">En venta desde</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td className="max-w-[360px] py-2.5 pr-3">
                      <ProductName product={p} />
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-[var(--text)]">{formatPrice(p.revenue, currency)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {p.revenueGrowth == null ? '—' : <Growth value={p.revenueGrowth} />}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-[var(--text)]">{formatCompact(p.salesCount)}</td>
                    <td className="py-2.5 pr-3 text-right text-[var(--text)]">{money(p.unitPrice, currency)}</td>
                    <td className="py-2.5 pr-3 text-right text-[var(--text)]">{p.commission != null ? `${p.commission}%` : '—'}</td>
                    <td className="py-2.5 text-right text-[var(--text-muted)]">{p.launchDate ? formatDate(p.launchDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cartões */}
          <ul className="mt-4 flex flex-col gap-3 md:hidden">
            {products.map((p) => (
              <li key={p.id} className="rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-4">
                <ProductName product={p} />
                <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <MiniStat label="Ingresos" value={formatPrice(p.revenue, currency)} />
                  <MiniStat label="Vendidos" value={formatCompact(p.salesCount)} />
                  <MiniStat label="Precio medio" value={money(p.unitPrice, currency)} />
                  <MiniStat label="Comisión" value={p.commission != null ? `${p.commission}%` : '—'} />
                </dl>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--text-faint)]">
                  <Growth value={p.revenueGrowth} />
                  {p.launchDate && <span>En venta desde {formatDate(p.launchDate)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ProductName({ product }: { product: CreatorProductView }) {
  const name = (
    <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--text)]">{product.name}</span>
  );
  return (
    <div className="flex items-center gap-3">
      {product.image ? (
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-sunken)]">
          <Image src={product.image} alt="" fill sizes="40px" className="object-cover" unoptimized />
        </span>
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--bg-sunken)] text-[var(--text-faint)]">
          <IconStore className="h-4 w-4" />
        </span>
      )}
      {product.productId ? (
        <Link href={`/catalogo/${product.productId}`} className="min-w-0 hover:underline">
          {name}
        </Link>
      ) : (
        <div className="min-w-0">{name}</div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- aba: lojas */

function ShopsTab({ creator }: { creator: CreatorDetail }) {
  const shops = creator.shopCount;
  return (
    <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Tiendas</h3>
      <div className="mt-3 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--violet-soft)] text-[var(--brand)]">
          <IconStore className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[20px] font-semibold leading-tight tabular-nums text-[var(--text)]">{compact(shops)}</p>
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {shops != null ? `Vendió productos de ${shops} ${shops === 1 ? 'tienda' : 'tiendas'} en el período` : 'Sin dato de tiendas en el período'}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- aba: lives */

function LivesTab({ creator, currency }: { creator: CreatorDetail; currency: string }) {
  const count = creator.liveCount ?? 0;
  return (
    <section className="mt-4 rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Lives</h3>
      <p className="mt-1 text-[13px] text-[var(--text-muted)]">Transmisiones en vivo con ventas en los últimos 30 días (Kalodata)</p>

      {count === 0 ? (
        <Empty>Sin lives en los últimos 30 días</Empty>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Lives" value={formatCompact(count)} strong />
          <Stat label="Ingresos en vivo" value={money(creator.liveRevenue, currency)} />
          <Stat label="Visualizaciones en vivo" value={compact(creator.liveViews)} />
          <Stat label="GPM live" value={money(creator.liveGpm, currency)} hint="Ingresos por 1.000 views" />
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- utils */

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-[18px] border border-dashed border-[var(--border-strong)] py-10 text-center text-[13.5px] text-[var(--text-muted)]">
      {children}
    </div>
  );
}

function initials(name: string) {
  const parts = name.replace(/^@/, '').trim().split(/\s+/).filter(Boolean);
  const text = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
  return text.toUpperCase();
}

function money(value: number | undefined, currency: string) {
  return value == null ? '—' : formatPrice(value, currency);
}

function compact(value: number | undefined) {
  return value == null ? '—' : formatCompact(value);
}

function percent(value: number | undefined) {
  return value == null ? '—' : `${value.toFixed(2).replace('.', ',')}%`;
}

/** "2026-10-04" → "4 oct 2026", sem depender do fuso do servidor. */
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-419', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
