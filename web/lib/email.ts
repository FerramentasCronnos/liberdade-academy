/**
 * Envio de e-mails pela Resend.
 *
 * Chamada direta à API HTTP em vez do SDK: é um único endpoint e evita mais
 * uma dependência. A chave vem de RESEND_API_KEY; sem ela, o envio é pulado
 * e devolve erro em vez de derrubar o fluxo que chamou.
 */
const APP_URL = process.env.APP_URL || 'https://catalogo.s4accelerator.com';
const FROM = process.env.EMAIL_FROM || 'Máquina de Ventas Automáticas <onboarding@resend.dev>';
/** Caixa que recebe respostas e pedidos de descadastro: conta para a reputação. */
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'ferramentas@brainexperts.com.br';

/** Versão em texto do HTML: filtros de spam desconfiam de e-mail só com HTML. */
function toText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

function envelope(to: string, subject: string, html: string) {
  return {
    from: FROM,
    to: [to],
    reply_to: REPLY_TO,
    subject,
    html,
    text: toText(html),
    headers: {
      'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=baja>`,
    },
  };
}

interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Endereço plausível e fora dos domínios de teste que a Resend recusa. */
export function isDeliverable(email: string) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) && !/@(example\.(com|org|net)|test\.com|localhost)$/i.test(email);
}

/**
 * Mesmo e-mail para muitas pessoas. Tenta em lotes de 100; se a Resend
 * recusar um lote (um único endereço ruim derruba o lote inteiro), reenvia
 * um a um para não perder os demais.
 */
export async function sendBatch(
  recipients: string[],
  subject: string,
  html: string,
): Promise<{ sent: number; failed: string[]; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: 0, failed: recipients, error: 'RESEND_API_KEY não configurada' };

  const list = recipients.filter(isDeliverable);
  const failed: string[] = recipients.filter((r) => !isDeliverable(r));
  let sent = 0;
  let lastError: string | undefined;

  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map((to) => envelope(to, subject, html))),
    });
    if (response.ok) {
      sent += chunk.length;
      continue;
    }

    // lote recusado: um a um, respeitando o limite de 2 envios por segundo
    for (const to of chunk) {
      const one = await send(to, subject, html);
      if (one.ok) sent += 1;
      else {
        failed.push(to);
        lastError = one.error;
      }
      await new Promise((r) => setTimeout(r, 550));
    }
  }

  return { sent, failed, error: sent === 0 && list.length > 0 ? lastError : undefined };
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY não configurada' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope(to, subject, html)),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) return { ok: false, error: data.message || `HTTP ${response.status}` };
  return { ok: true, id: data.id };
}

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Bloco da marca: o logo é tipográfico, igual ao do site. */
function brand() {
  return `
    <div style="padding:0 0 28px 0;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#17143a;line-height:1;">MVA</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6d5ce7;margin-top:6px;">Máquina de Ventas Automáticas</div>
    </div>`;
}

/** Texto que o Gmail mostra ao lado do assunto. Oculto no corpo. */
function preheaderBlock(text: string) {
  const padded = escape(text.slice(0, 110)) + '&#847;&zwnj;&nbsp;'.repeat(40);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${padded}</div>`;
}

/** Tira emojis e símbolos decorativos de um trecho para o preheader. */
export function plainExcerpt(text: string, max = 110) {
  const clean = text
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[¡!]{2,}/g, '!')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60))}…`;
}

function layout(body: string, preheader?: string) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Máquina de Ventas Automáticas</title></head>
<body style="margin:0;padding:0;background:#f3f1fb;">
  ${preheader ? preheaderBlock(preheader) : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:22px;padding:40px 36px;font-family:Helvetica,Arial,sans-serif;color:#2b2846;">
        <tr><td>${brand()}${body}</td></tr>
      </table>
      <p style="max-width:560px;margin:20px auto 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8b87a6;text-align:center;line-height:1.6;">
        Recibiste este correo porque eres miembro de Máquina de Ventas Automáticas (MVA).<br>
        Para dejar de recibir avisos, responde a este correo con la palabra <strong>baja</strong>.<br>
        Máquina de Ventas Automáticas · Brain Experts · ${escape(APP_URL.replace(/^https?:\/\//, ''))}
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/** Aviso de anúncio novo, para todos os membros. */
export function announcementEmail(input: { title: string; excerpt: string; postId: string; image?: string; link?: string }) {
  const url = `${APP_URL}/comunidade/post/${input.postId}`;
  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6d5ce7;">📣 Nuevo anuncio</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#17143a;line-height:1.25;">${escape(input.title)}</h1>
    ${input.image ? `<img src="${escape(input.image)}" alt="" style="display:block;width:100%;height:auto;border-radius:14px;margin:0 0 16px;">` : ''}
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4668;white-space:pre-line;">${escape(input.excerpt)}</p>
    <a href="${url}" style="display:inline-block;background:#6d5ce7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Ver el anuncio completo</a>
    ${input.link ? `<p style="margin:16px 0 0;font-size:13.5px;color:#8b87a6;">Enlace del anuncio: <a href="${escape(input.link)}" style="color:#6d5ce7;">${escape(input.link)}</a></p>` : ''}`;
  // preheader: o começo do conteúdo, sem emojis, sem repetir o título
  const preheader = plainExcerpt(input.excerpt) || 'Hay un anuncio nuevo en la plataforma.';
  return { subject: `Nuevo anuncio: ${plainExcerpt(input.title, 80)}`, html: layout(body, preheader) };
}

/** Alguém respondeu a publicação do membro: convite para voltar e ver. */
export function sendReplyEmail(input: {
  to: string;
  authorName: string;
  commenterName: string;
  excerpt: string;
  postId: string;
  spaceName?: string;
}) {
  const url = `${APP_URL}/comunidade/post/${input.postId}`;
  const first = escape(input.authorName.split(' ')[0] || input.authorName);
  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6d5ce7;">💬 Nueva respuesta${input.spaceName ? ` en ${escape(input.spaceName)}` : ''}</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#17143a;line-height:1.25;">${first}, ${escape(input.commenterName)} te respondió</h1>
    <blockquote style="margin:0 0 24px;padding:14px 18px;border-left:3px solid #6d5ce7;background:#f6f4ff;border-radius:0 12px 12px 0;font-size:15px;line-height:1.6;color:#4a4668;white-space:pre-line;">${escape(input.excerpt)}</blockquote>
    <a href="${url}" style="display:inline-block;background:#6d5ce7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Ver la respuesta</a>
    <p style="margin:16px 0 0;font-size:13.5px;color:#8b87a6;">Si el botón no funciona, copia este enlace: <a href="${url}" style="color:#6d5ce7;">${url}</a></p>`;
  return send(
    input.to,
    `${input.commenterName} respondió tu publicación`,
    layout(body, plainExcerpt(input.excerpt) || 'Entra a la comunidad para ver la respuesta.'),
  );
}

/** Boas-vindas com as credenciais. Em espanhol, como a plataforma. */
export function sendAccessEmail(input: { name: string; email: string; password: string }) {
  const first = escape(input.name.split(' ')[0] || input.name);
  const loginUrl = `${APP_URL}/login`;

  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;color:#17143a;line-height:1.2;">¡Bienvenida, ${first}! 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4668;">
      Tu acceso a <strong>Máquina de Ventas Automáticas</strong> ya está listo. Adentro vas a encontrar el catálogo de productos virales, las páginas de presell, la comunidad y las misiones para ganar puntos.
    </p>

    <div style="background:#f6f4ff;border:1px solid #e4e0f7;border-radius:16px;padding:20px 22px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6d5ce7;margin-bottom:12px;">Tus datos de acceso</div>
      <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:15px;line-height:1.8;color:#2b2846;">
        <tr><td style="color:#8b87a6;padding-right:18px;">Correo</td><td><strong>${escape(input.email)}</strong></td></tr>
        <tr><td style="color:#8b87a6;padding-right:18px;">Contraseña</td><td><code style="font-family:Menlo,Consolas,monospace;font-size:15px;background:#ffffff;border:1px solid #e4e0f7;border-radius:6px;padding:2px 8px;">${escape(input.password)}</code></td></tr>
      </table>
    </div>

    <a href="${loginUrl}" style="display:inline-block;background:#6d5ce7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Entrar a la plataforma</a>

    <p style="margin:24px 0 0;font-size:13.5px;line-height:1.6;color:#8b87a6;">
      Guarda este correo. Puedes cambiar tu contraseña cuando quieras desde tu perfil.<br>
      Si el botón no funciona, copia este enlace: <a href="${loginUrl}" style="color:#6d5ce7;">${loginUrl}</a>
    </p>`;

  return send(
    input.email,
    'Tu acceso a Máquina de Ventas Automáticas está listo',
    layout(body, 'Tus datos de acceso están adentro. Entra y empieza por el catálogo de productos virales.'),
  );
}
