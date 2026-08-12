/* eslint-disable @next/next/no-img-element */

/**
 * Avatar com foto ou iniciais.
 *
 * Usa <img> em vez de next/image de propósito: a origem é a nossa API de
 * uploads, com URL variável por ambiente, e o ganho de otimização num círculo
 * de 36px não paga a configuração de remotePatterns.
 */
export function Avatar({
  name,
  src,
  size = 40,
  color,
  fallback,
  className = '',
}: {
  name: string;
  src?: string;
  size?: number;
  color: string;
  fallback: string;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...style, backgroundColor: color, fontSize: Math.max(11, size * 0.36) }}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      aria-hidden
    >
      {fallback}
    </span>
  );
}
