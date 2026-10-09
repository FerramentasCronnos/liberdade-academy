export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  // Sem símbolo: só a marca em texto, com a hierarquia entre nome e categoria.
  if (compact) {
    return (
      <span
        className={`font-display text-[17px] font-semibold tracking-tight ${
          onDark ? 'text-white' : 'text-[var(--text)]'
        }`}
      >
        MVA
      </span>
    );
  }

  return (
    <span className="select-none leading-none">
      <span
        className={`block font-display text-[22px] font-bold tracking-tight ${
          onDark ? 'text-white' : 'text-[var(--text)]'
        }`}
      >
        MVA
      </span>
      <span
        className={`block text-[9.5px] font-semibold uppercase tracking-[0.14em] ${
          onDark ? 'text-white/60' : 'text-[var(--accent-text)]'
        }`}
      >
        Máquina de Ventas Automáticas
      </span>
    </span>
  );
}
