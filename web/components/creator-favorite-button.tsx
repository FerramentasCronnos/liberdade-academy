'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { toggleCreatorFavorite } from '@/app/(app)/bank-offers/actions';
import { IconStar } from './icons';

/**
 * Estrela de favorito do criador, com estado otimista: muda na hora e
 * volta atrás se o servidor recusar. Para e cancela o evento para poder
 * viver dentro de uma linha que é um Link sem disparar a navegação.
 */
export function CreatorFavoriteButton({
  creatorId,
  favorite,
  compact = false,
  onChange,
}: {
  creatorId: string;
  favorite: boolean;
  compact?: boolean;
  /** Avisa o pai a cada mudança (otimista e confirmada), para listas que filtram por favorito. */
  onChange?: (favorite: boolean) => void;
}) {
  const [on, setOn] = useState(favorite);
  const [seen, setSeen] = useState(favorite);
  const [pending, startTransition] = useTransition();

  // Acompanha o valor do servidor quando a página revalida, sem remontar o botão.
  if (favorite !== seen) {
    setSeen(favorite);
    setOn(favorite);
  }

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const next = !on;
    setOn(next);
    onChange?.(next);
    startTransition(async () => {
      const result = await toggleCreatorFavorite(creatorId);
      const final = 'error' in result ? !next : result.favorite;
      setOn(final);
      onChange?.(final);
    });
  }

  const label = on ? 'Quitar de favoritos' : 'Guardar creador';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={on}
        aria-label={label}
        title={label}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${
          on
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-faint)] hover:border-[var(--border-strong)] hover:text-[var(--accent)]'
        } ${pending ? 'opacity-70' : ''}`}
      >
        <IconStar className={`h-4 w-4 ${on ? '' : '[fill:none] [stroke:currentColor] [stroke-width:1.7]'}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-[var(--shadow-soft)] transition ${
        on
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)]'
      } ${pending ? 'opacity-70' : ''}`}
    >
      <IconStar className={`h-4 w-4 ${on ? 'text-[var(--accent)]' : 'text-[var(--text-faint)] [fill:none] [stroke:currentColor] [stroke-width:1.7]'}`} />
      {on ? 'Guardado' : 'Guardar'}
    </button>
  );
}
