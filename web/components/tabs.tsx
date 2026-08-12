'use client';

import { useState } from 'react';

/**
 * Alternador de abas com pílulas.
 * Mantém as duas listas montadas e só esconde a inativa — trocar de aba não
 * refaz requisição nem perde a rolagem.
 */
export function Tabs({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; count?: number; content: React.ReactNode }>;
}) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <>
      <div className="inline-flex gap-1 rounded-full bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-soft)]">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-selected={isActive}
              role="tab"
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                isActive
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab.label}
              {tab.count != null && ` (${tab.count})`}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div key={tab.id} hidden={active !== tab.id}>
          {tab.content}
        </div>
      ))}
    </>
  );
}
