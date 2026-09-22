import { ThemeToggle } from '@/components/theme-toggle';
import { spaceColor, type Space } from '@/lib/community';

/**
 * Capa do espaço, como no Circle: bloco de cor com formas, a frase do espaço
 * em destaque e, abaixo, a linha com nome, contagens e ação principal.
 */
export function SpaceHero({
  space,
  pill,
  members,
  action,
}: {
  space: Space;
  pill?: string;
  members?: number;
  action?: React.ReactNode;
}) {
  const color = spaceColor(space.slug);

  return (
    <section className="overflow-hidden rounded-[22px] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]">
      <div className="relative overflow-hidden px-7 py-9 sm:px-10 sm:py-12" style={{ background: color.cover, color: color.ink }}>
        {/* formas decorativas */}
        <div className="pointer-events-none absolute -right-10 -bottom-24 h-[260px] w-[260px] rounded-full bg-white/35" aria-hidden />
        <div className="pointer-events-none absolute right-28 -bottom-10 h-[180px] w-[180px] rounded-full opacity-90" style={{ backgroundColor: color.dot }} aria-hidden />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.45)_0_6px,transparent_6px_16px)]" aria-hidden />

        {pill && (
          <span className="relative inline-block rounded-full bg-white/55 px-3.5 py-1.5 text-[13px] font-semibold">
            {pill}
          </span>
        )}
        <h1 className="relative mt-4 max-w-[560px] font-display text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[40px]">
          {space.description}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
        <p className="flex min-w-0 flex-1 items-center gap-2.5 font-display text-[22px] font-semibold text-[var(--text)]">
          <span aria-hidden>{space.emoji}</span>
          <span className="truncate">{space.name}</span>
        </p>
        {typeof members === 'number' && (
          <span className="text-[13px] text-[var(--text-muted)]">
            {members} {members === 1 ? 'miembro' : 'miembros'} · {space.postCount} {space.postCount === 1 ? 'publicación' : 'publicaciones'}
          </span>
        )}
        {action}
        <ThemeToggle />
      </div>
    </section>
  );
}
