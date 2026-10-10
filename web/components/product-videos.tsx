import { formatCompact, formatPrice } from '@/lib/api';
import type { ProductVideoView } from '@/lib/queries';
import { IconExternal, IconHeart, IconTikTok } from '@/components/icons';

/**
 * Vídeos de criadores que mais venderam o produto (dados da Kalodata).
 *
 * O vídeo em si vem do Player oficial do TikTok (player/v1/<id>), que toca
 * dentro de um iframe sem login. A Kalodata não entrega capa nem URL, por isso
 * o player é montado só com o id do vídeo; os números (vendas, views) vêm dela.
 */
function playerUrl(videoId: string) {
  const params = new URLSearchParams({ controls: '1', description: '1', music_info: '1', rel: '0', loop: '1' });
  return `https://www.tiktok.com/player/v1/${videoId}?${params}`;
}
export function ProductVideos({ videos, currency }: { videos: ProductVideoView[]; currency: string }) {
  if (!videos.length) return null;

  const syncedAt = videos[0].syncedAt.slice(0, 10);

  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">
            Videos de referencia
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
            Los videos de creadores que más vendieron este producto. Mira cómo lo presentan antes de
            grabar el tuyo.
          </p>
        </div>
        <p className="text-[11.5px] text-[var(--text-faint)]">
          Fuente: Kalodata · últimos 30 días · actualizado {formatDate(syncedAt)}
        </p>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video, index) => (
          <li
            key={video.id}
            className="flex flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-ink-900)] text-white">
                <IconTikTok className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`https://www.tiktok.com/@${video.creatorHandle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block truncate text-[14px] font-semibold text-[var(--text)] hover:underline"
                >
                  @{video.creatorHandle}
                </a>
                <p className="text-[11.5px] text-[var(--text-faint)]">
                  #{index + 1} en ventas
                  {video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ''}
                  {video.isAd ? ' · con anuncio' : ''}
                </p>
              </div>
            </div>

            <div className="relative aspect-[9/16] overflow-hidden rounded-[14px] bg-[var(--color-ink-900)]">
              <iframe
                src={playerUrl(video.videoId)}
                title={video.title || `Video de @${video.creatorHandle}`}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                allow="fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            {video.title && (
              <p className="line-clamp-2 text-[13px] leading-snug text-[var(--text-muted)]">{video.title}</p>
            )}

            <dl className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Ventas est." value={formatPrice(video.revenue, currency)} />
              <Stat label="Views" value={formatCompact(video.views)} />
              <Stat label="Likes" value={formatCompact(video.likes)} icon={<IconHeart className="h-3 w-3" />} />
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
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
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
