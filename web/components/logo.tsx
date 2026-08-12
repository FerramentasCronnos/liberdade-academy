export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 select-none">
      <span
        className={`relative grid h-10 w-10 place-items-center rounded-2xl ${
          onDark ? 'bg-white/15' : 'bg-[var(--brand)]'
        }`}
      >
        {/* monograma: haste do "L" + arco do "A", legível a 32px */}
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden>
          <path
            d="M7 4v16h10"
            stroke={onDark ? '#ffffff' : '#ffffff'}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.5" cy="7.5" r="2.6" stroke="var(--color-gold-400)" strokeWidth="2.4" />
        </svg>
      </span>

      {!compact && (
        <span className="leading-none">
          <span
            className={`block font-display text-[17px] font-semibold tracking-tight ${
              onDark ? 'text-white' : 'text-[var(--text)]'
            }`}
          >
            Liberdade
          </span>
          <span
            className={`block text-[10.5px] font-semibold uppercase tracking-[0.24em] ${
              onDark ? 'text-white/60' : 'text-[var(--accent-text)]'
            }`}
          >
            Academy
          </span>
        </span>
      )}
    </span>
  );
}
