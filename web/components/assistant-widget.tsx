'use client';

import { useEffect, useRef, useState } from 'react';
import { IconMessage, IconX } from './icons';

/**
 * Widget de suporte com IA, no canto inferior direito de todas as telas.
 *
 * Abre com a escolha do assistente, segue como chat e, quando a IA não
 * resolve, mostra o botão do WhatsApp da equipe. O menu lateral também
 * abre o widget disparando o evento "la:open-assistant".
 */
type AssistantId = 'general' | 'trafico';

const ASSISTANTS: Array<{ id: AssistantId; name: string; emoji: string; tagline: string }> = [
  { id: 'general', name: 'Soporte general', emoji: '🛟', tagline: 'Plataforma, acceso, herramientas y cómo empezar.' },
  { id: 'trafico', name: 'Tráfico', emoji: '🚀', tagline: 'Meta Ads, Google Ads, TikTok y contenido que vende.' },
];

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  whatsapp?: string;
}

export function AssistantWidget({ whatsappFallback }: { whatsappFallback: string }) {
  const [open, setOpen] = useState(false);
  const [assistant, setAssistant] = useState<AssistantId | null>(null);
  const [chatId, setChatId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('la:open-assistant', onOpen);
    return () => window.removeEventListener('la:open-assistant', onOpen);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  const current = ASSISTANTS.find((a) => a.id === assistant);

  const reset = () => {
    setAssistant(null);
    setChatId(undefined);
    setMessages([]);
    setError(null);
  };

  const choose = (id: AssistantId) => {
    const a = ASSISTANTS.find((x) => x.id === id)!;
    setAssistant(id);
    setMessages([{ role: 'assistant', content: `¡Hola! Soy el asistente de ${a.name}. Cuéntame tu duda con detalle y te ayudo. Si no logro resolverla, te paso con el equipo.` }]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !assistant || busy) return;
    setDraft('');
    setError(null);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant, chatId, message: text }),
      });
      const data = (await res.json()) as { chatId?: string; reply?: string; escalate?: boolean; whatsapp?: string; message?: string };
      if (!res.ok) throw new Error(data.message || 'Error');
      setChatId(data.chatId);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? '', whatsapp: data.escalate ? data.whatsapp : undefined }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude responder ahora.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar chat de soporte' : 'Abrir chat de soporte'}
        className="fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-[var(--shadow-lift)] transition hover:bg-[var(--brand-hover)] lg:bottom-6 lg:right-6"
      >
        {open ? <IconX className="h-6 w-6" /> : <IconMessage className="h-6 w-6" />}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Chat de soporte"
          className="fixed bottom-[152px] right-4 z-40 flex h-[min(620px,calc(100dvh-170px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lift)] lg:bottom-24 lg:right-6"
        >
          <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
            {current ? (
              <>
                <span className="text-[22px]" aria-hidden>{current.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text)]">{current.name}</p>
                  <p className="text-[11.5px] text-[var(--text-muted)]">Asistente con IA · responde al instante</p>
                </div>
                <button type="button" onClick={reset} className="text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">Cambiar</button>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="font-display text-[17px] font-semibold text-[var(--text)]">¿En qué te ayudamos?</p>
                <p className="text-[12px] text-[var(--text-muted)]">Elige el tema de tu duda.</p>
              </div>
            )}
          </header>

          {!current ? (
            <div className="flex flex-1 flex-col gap-2 p-4">
              {ASSISTANTS.map((a) => (
                <button key={a.id} type="button" onClick={() => choose(a.id)} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]/60 p-4 text-left transition hover:border-[var(--brand)] hover:bg-[var(--violet-soft)]/50">
                  <span className="text-[24px]" aria-hidden>{a.emoji}</span>
                  <span>
                    <span className="block text-[14.5px] font-semibold text-[var(--text)]">{a.name}</span>
                    <span className="block text-[12.5px] text-[var(--text-muted)]">{a.tagline}</span>
                  </span>
                </button>
              ))}
              <a href={whatsappFallback} target="_blank" rel="noreferrer" className="mt-auto text-center text-[12.5px] font-semibold text-[var(--text-muted)] underline-offset-2 hover:underline">
                Prefiero hablar con una persona por WhatsApp
              </a>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <ul className="flex flex-col gap-2.5">
                  {messages.map((m, i) => (
                    <li key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.role === 'user' ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-sunken)] text-[var(--text)]'}`}>
                        {m.content}
                        {m.whatsapp && (
                          <a href={m.whatsapp} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-[13px] font-semibold text-white">
                            💬 Hablar con el equipo por WhatsApp
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                  {busy && (
                    <li className="flex justify-start">
                      <div className="rounded-2xl bg-[var(--bg-sunken)] px-3.5 py-2.5 text-[13.5px] text-[var(--text-faint)]">Escribiendo…</div>
                    </li>
                  )}
                </ul>
                {error && <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                <div ref={endRef} />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); void send(); }}
                className="flex items-end gap-2 border-t border-[var(--border)] p-3"
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  rows={2}
                  maxLength={2000}
                  placeholder="Escribe tu duda…"
                  className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[13.5px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand)]"
                />
                <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--text)] text-[var(--bg-elevated)] disabled:opacity-50">↑</button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
