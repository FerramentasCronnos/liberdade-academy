import type { ReactNode } from 'react';

/**
 * Texto com links clicáveis. As respostas do suporte (IA e equipe) trazem
 * URLs cruas, inclusive o wa.me com a mensagem codificada, que ficava enorme
 * e sem clique. Aqui cada URL vira um link curto: WhatsApp vira um botão e as
 * outras mostram só o domínio.
 */
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function label(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.length > 24 ? `${u.pathname.slice(0, 24)}…` : u.pathname;
    return `${u.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url.length > 40 ? `${url.slice(0, 40)}…` : url;
  }
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  const nodes: ReactNode[] = parts.map((part, index) => {
    if (index % 2 === 0) return part;
    const isWhatsapp = /^https?:\/\/(wa\.me|api\.whatsapp\.com|wa\.link)/i.test(part);
    if (isWhatsapp) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="my-1 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[13px] font-semibold text-white no-underline hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4 5.1 5.1 0 0 0 3.1.6 2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" />
          </svg>
          Abrir WhatsApp
        </a>
      );
    }
    return (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-[var(--brand)] underline underline-offset-2">
        {label(part)}
      </a>
    );
  });
  return <span className={className}>{nodes}</span>;
}
