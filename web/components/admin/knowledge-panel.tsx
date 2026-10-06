'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteKnowledge, uploadKnowledge, type AdminState } from '@/app/(app)/admin/actions';
import type { KnowledgeDocItem } from '@/lib/knowledge';

const input = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2.5 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--brand)]';
const LABEL: Record<string, string> = { general: '🛟 Soporte general', trafico: '🚀 Tráfico' };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60">
      {pending ? 'Procesando…' : 'Agregar a la base'}
    </button>
  );
}

export function KnowledgePanel({ docs }: { docs: KnowledgeDocItem[] }) {
  const [state, action] = useActionState<AdminState, FormData>(uploadKnowledge, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <div className="flex flex-col gap-4">
      <form ref={ref} action={action} className="rounded-[22px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-[17px] font-semibold text-[var(--text)]">Subir clase o material</h3>
        <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">PDF, Word, texto o subtítulos (SRT/VTT). El asistente responde con base en lo que está aquí.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[12.5px] font-semibold text-[var(--text-muted)]">
            Asistente
            <select name="assistant" className={`${input} mt-1`} defaultValue="general">
              <option value="general">🛟 Soporte general</option>
              <option value="trafico">🚀 Tráfico</option>
            </select>
          </label>
          <label className="text-[12.5px] font-semibold text-[var(--text-muted)]">
            Título (opcional)
            <input name="title" placeholder="Ej.: Clase 3 — Cómo elegir productos" className={`${input} mt-1`} />
          </label>
          <label className="text-[12.5px] font-semibold text-[var(--text-muted)] sm:col-span-2">
            Archivo
            <input name="file" type="file" accept=".pdf,.docx,.txt,.md,.srt,.vtt" className={`${input} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--violet-soft)] file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-[var(--brand)]`} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Submit />
          {state.ok && <p className="text-[12.5px] font-medium text-[var(--money)]">{state.ok}</p>}
          {state.error && <p role="alert" className="text-[12.5px] font-medium text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>

      {docs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[13.5px] text-[var(--text-muted)]">
          Todavía no hay material. Mientras tanto, los asistentes responden con conocimiento general y derivan al equipo en dudas del curso.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-[18px] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-soft)]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[var(--text)]">{d.title}</p>
                <p className="text-[12px] text-[var(--text-faint)]">
                  {LABEL[d.assistant] ?? d.assistant} · {d.chunks} fragmentos · {Math.round(d.chars / 1000)} mil caracteres · {new Date(d.createdAt).toLocaleDateString('es-419')}
                </p>
              </div>
              <form action={deleteKnowledge}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--text-faint)] transition hover:bg-[var(--bg-sunken)] hover:text-red-500">Quitar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
