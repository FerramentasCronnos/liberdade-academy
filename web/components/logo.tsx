export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  // Sem símbolo: só a marca em texto, com a hierarquia entre nome e categoria.
  if (compact) {
    return (
      <span
        className={`font-display text-[17px] font-semibold tracking-tight ${
          onDark ? 'text-white' : 'text-[var(--text)]'
        }`}
      >
        LA
      </span>
    );
  }

  return (
    <span className="select-none leading-none">
      <span
        className={`block font-display text-[19px] font-semibold tracking-tight ${
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
  );
}
