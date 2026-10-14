import Image from 'next/image';

/**
 * Marca MVA.
 *
 * O logo real (letras douradas, fundo transparente) funciona tanto sobre o
 * navy da sidebar/login quanto sobre o creme das telas claras — por isso a
 * mesma imagem serve às duas variantes e `onDark` só ajusta a legenda.
 * `unoptimized`: o PNG já é pequeno e com transparência; passar pelo
 * otimizador só adicionaria uma requisição sem ganho.
 */
const LOGO = '/brand/mva-logo.png';
// Proporção do arquivo (720×128) — mantida pra não deformar as letras.
const RATIO = 720 / 128;

export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  if (compact) {
    return (
      <Image
        src={LOGO}
        alt="MVA"
        width={64}
        height={Math.round(64 / RATIO)}
        unoptimized
        priority
        className="h-auto w-[64px] select-none"
      />
    );
  }

  return (
    <span className="inline-flex select-none flex-col items-start leading-none">
      <Image
        src={LOGO}
        alt="MVA"
        width={150}
        height={Math.round(150 / RATIO)}
        unoptimized
        priority
        className="h-auto w-[150px]"
      />
      <span
        className={`mt-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.14em] ${
          onDark ? 'text-white/60' : 'text-[var(--accent-text)]'
        }`}
      >
        Máquina de Ventas Automáticas
      </span>
    </span>
  );
}
