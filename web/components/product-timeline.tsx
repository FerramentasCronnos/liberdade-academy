import Link from 'next/link';
import type { ProductTimeline as Timeline, TimelineHighlight } from '@/lib/product-timeline';
import { PrintCarousel } from './print-carousel';

/** Aba "Historia y resultados": números de destaque e marcos com prints. */
export function ProductTimeline({ timeline }: { timeline: Timeline }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">{timeline.title ?? 'Historia del producto'}</h3>
          {timeline.draft && <DraftBadge />}
        </div>
        {timeline.intro && <p className="mt-1 text-[13px] text-[var(--text-muted)]">{timeline.intro}</p>}
        {timeline.highlights.length > 0 && <Highlights items={timeline.highlights} className="mt-4" />}
      </section>

      <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Línea de tiempo</h3>
        <ol className="mt-5">
          {timeline.milestones.map((m, index) => {
            const last = index === timeline.milestones.length - 1;
            return (
              <li key={`${m.date}-${m.title}`} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
                {/* trilho */}
                <div className="flex flex-col items-center" aria-hidden>
                  <span
                    className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      last ? 'bg-[var(--brand)] text-white' : 'bg-[var(--violet-soft)] text-[var(--brand)]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  {!last && <span className="mt-1 w-[2px] flex-1 rounded-full bg-[var(--border)]" />}
                </div>

                <div className={last ? 'pb-1' : 'pb-8'}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="rounded-md bg-[var(--bg-sunken)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {m.date}
                    </span>
                    {m.stat && (
                      <span className="text-[13px] text-[var(--text-muted)]">
                        <strong className="font-display text-[15px] font-semibold text-[var(--money)]">{m.stat.value}</strong>{' '}
                        {m.stat.label}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1.5 font-display text-[16px] font-semibold leading-snug text-[var(--text)]">{m.title}</h4>
                  {m.text && <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{m.text}</p>}
                  <div className="mt-3">
                    <PrintCarousel images={m.images} title={m.title} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** Resumo na aba "Oferta", com link para a historia completa. */
export function ProductTimelineTeaser({ timeline, href }: { timeline: Timeline; href: string }) {
  const prints = timeline.milestones.reduce((n, m) => n + m.images.length, 0);
  return (
    <section className="rounded-[24px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[16px] font-semibold text-[var(--text)]">Historia y resultados</h3>
          {timeline.draft && <DraftBadge />}
        </div>
        <Link href={href} scroll={false} className="text-[13px] font-semibold text-[var(--brand)] hover:underline">
          Ver la historia completa →
        </Link>
      </div>
      {timeline.highlights.length > 0 && <Highlights items={timeline.highlights} className="mt-4" />}
      <p className="mt-3 text-[12.5px] text-[var(--text-faint)]">
        {timeline.milestones.length} momentos
        {prints > 0 ? ` · ${prints} prints de ventas y resultados` : ''}
      </p>
    </section>
  );
}

function Highlights({ items, className = '' }: { items: TimelineHighlight[]; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      {items.map((h) => (
        <div key={h.label} className="rounded-2xl bg-[var(--bg-sunken)] px-3 py-2.5">
          <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{h.label}</p>
          <p className="mt-0.5 font-display text-[20px] font-semibold leading-tight text-[var(--text)]">{h.value}</p>
        </div>
      ))}
    </div>
  );
}

function DraftBadge() {
  return (
    <span className="rounded-md bg-[var(--color-gold-400)]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text)]">
      Borrador · solo admin
    </span>
  );
}
