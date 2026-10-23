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
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#0e1729;line-height:1;">MVA</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ab7a24;margin-top:6px;">Máquina de Ventas Automáticas</div>
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
<body style="margin:0;padding:0;background:#eaf0fb;">
  ${preheader ? preheaderBlock(preheader) : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eaf0fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:22px;padding:40px 36px;font-family:Helvetica,Arial,sans-serif;color:#16223a;">
        <tr><td>${brand()}${body}</td></tr>
      </table>
      <p style="max-width:560px;margin:20px auto 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6b7d9c;text-align:center;line-height:1.6;">
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
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1b3a6b;">📣 Nuevo anuncio</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#0e1729;line-height:1.25;">${escape(input.title)}</h1>
    ${input.image ? `<img src="${escape(input.image)}" alt="" style="display:block;width:100%;height:auto;border-radius:14px;margin:0 0 16px;">` : ''}
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#32425f;white-space:pre-line;">${escape(input.excerpt)}</p>
    <a href="${url}" style="display:inline-block;background:#1b3a6b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Ver el anuncio completo</a>
    ${input.link ? `<p style="margin:16px 0 0;font-size:13.5px;color:#6b7d9c;">Enlace del anuncio: <a href="${escape(input.link)}" style="color:#1b3a6b;">${escape(input.link)}</a></p>` : ''}`;
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
  /** Link alternativo (ex.: ticket) no lugar da página do post. */
  url?: string;
}) {
  const url = input.url ?? `${APP_URL}/comunidade/post/${input.postId}`;
  const first = escape(input.authorName.split(' ')[0] || input.authorName);
  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1b3a6b;">💬 Nueva respuesta${input.spaceName ? ` en ${escape(input.spaceName)}` : ''}</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#0e1729;line-height:1.25;">${first}, ${escape(input.commenterName)} te respondió</h1>
    <blockquote style="margin:0 0 24px;padding:14px 18px;border-left:3px solid #1b3a6b;background:#e6edf7;border-radius:0 12px 12px 0;font-size:15px;line-height:1.6;color:#32425f;white-space:pre-line;">${escape(input.excerpt)}</blockquote>
    <a href="${url}" style="display:inline-block;background:#1b3a6b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Ver la respuesta</a>
    <p style="margin:16px 0 0;font-size:13.5px;color:#6b7d9c;">Si el botón no funciona, copia este enlace: <a href="${url}" style="color:#1b3a6b;">${url}</a></p>`;
  return send(
    input.to,
    `${input.commenterName} respondió tu publicación`,
    layout(body, plainExcerpt(input.excerpt) || 'Entra a la comunidad para ver la respuesta.'),
  );
}

/**
 * Aviso à equipe: um post ficou retido na moderação por falar de reembolso.
 * Vai para todos os admins (sem as contas bot) e para a caixa de respostas.
 */
export async function sendModerationEmail(input: {
  postId: string;
  authorName: string;
  title?: string;
  excerpt: string;
  term: string;
}): Promise<{ sent: number; failed: string[] }> {
  const { prisma } = await import('./db');
  const admins = await prisma.user.findMany({
    where: { isAdmin: true, NOT: [{ email: { endsWith: '@bot.liberdade.academy' } }, { email: { endsWith: '@demo.liberdade.academy' } }] },
    select: { email: true },
  });
  const recipients = Array.from(
    new Set([...admins.map((a) => a.email.toLowerCase()), ...(process.env.EMAIL_REPLY_TO ? [process.env.EMAIL_REPLY_TO.toLowerCase()] : [])]),
  ).filter(isDeliverable);

  const url = `${APP_URL}/admin?tab=moderacion`;
  const body = `
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1b3a6b;">🛡️ Moderación</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#0e1729;line-height:1.25;">Una publicación menciona “${escape(input.term)}”</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#32425f;">
      <strong>${escape(input.authorName)}</strong> escribió en la comunidad y la publicación quedó retenida hasta que el equipo la revise. Nadie más la ve todavía.
    </p>
    ${input.title ? `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#0e1729;">${escape(input.title)}</p>` : ''}
    <blockquote style="margin:0 0 24px;padding:14px 18px;border-left:3px solid #1b3a6b;background:#e6edf7;border-radius:0 12px 12px 0;font-size:15px;line-height:1.6;color:#32425f;white-space:pre-line;">${escape(input.excerpt)}</blockquote>
    <a href="${url}" style="display:inline-block;background:#1b3a6b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Revisar en el panel</a>
    <p style="margin:16px 0 0;font-size:13.5px;color:#6b7d9c;">Si el botón no funciona, copia este enlace: <a href="${url}" style="color:#1b3a6b;">${url}</a></p>`;
  const subject = `Post para revisar: menciona ${plainExcerpt(input.term, 60)}`;
  const html = layout(body, plainExcerpt(input.excerpt) || 'Hay una publicación esperando revisión.');

  let sent = 0;
  const failed: string[] = [];
  for (const to of recipients) {
    const result = await send(to, subject, html);
    if (result.ok) sent += 1;
    else failed.push(to);
  }
  return { sent, failed };
}

/** Boas-vindas com as credenciais. Em espanhol, como a plataforma. */
export function sendAccessEmail(input: { name: string; email: string; password: string }) {
  const first = escape(input.name.split(' ')[0] || input.name);
  const loginUrl = `${APP_URL}/login`;

  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;color:#0e1729;line-height:1.2;">¡Bienvenida, ${first}! 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#32425f;">
      Tu acceso a <strong>Máquina de Ventas Automáticas</strong> ya está listo. Adentro vas a encontrar el catálogo de productos virales, las páginas de presell, la comunidad y las misiones para ganar puntos.
    </p>

    <div style="background:#e6edf7;border:1px solid #cbd6ea;border-radius:16px;padding:20px 22px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1b3a6b;margin-bottom:12px;">Tus datos de acceso</div>
      <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:15px;line-height:1.8;color:#16223a;">
        <tr><td style="color:#6b7d9c;padding-right:18px;">Correo</td><td><strong>${escape(input.email)}</strong></td></tr>
        <tr><td style="color:#6b7d9c;padding-right:18px;">Contraseña</td><td><code style="font-family:Menlo,Consolas,monospace;font-size:15px;background:#ffffff;border:1px solid #cbd6ea;border-radius:6px;padding:2px 8px;">${escape(input.password)}</code></td></tr>
      </table>
    </div>

    <a href="${loginUrl}" style="display:inline-block;background:#1b3a6b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Entrar a la plataforma</a>

    <p style="margin:24px 0 0;font-size:13.5px;line-height:1.6;color:#6b7d9c;">
      Guarda este correo. Puedes cambiar tu contraseña cuando quieras desde tu perfil.<br>
      Si el botón no funciona, copia este enlace: <a href="${loginUrl}" style="color:#1b3a6b;">${loginUrl}</a>
    </p>`;

  return send(
    input.email,
    'Tu acceso a Máquina de Ventas Automáticas está listo',
    layout(body, 'Tus datos de acceso están adentro. Entra y empieza por el catálogo de productos virales.'),
  );
}

const MEMBERS_URL = 'https://class.s4accelerator.com/pt-br/club/caique-mva';

function platformCard(input: { kicker: string; title: string; text: string; url: string; button: string; note?: string }) {
  return `
    <div style="border:1px solid #cbd6ea;border-radius:16px;padding:20px 22px;margin:0 0 14px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#ab7a24;margin-bottom:6px;">${input.kicker}</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:600;color:#0e1729;margin-bottom:6px;">${input.title}</div>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#32425f;">${input.text}</p>
      ${input.note ? `<p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#1b3a6b;background:#e6edf7;border-radius:10px;padding:10px 12px;">${input.note}</p>` : ''}
      <a href="${input.url}" style="display:inline-block;background:#1b3a6b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:12px;">${input.button}</a>
    </div>`;
}

/**
 * E-mail único de acesso do MVA (compra na Kiwify ou na Hotmart): catálogo e BRAIN com o mesmo correio e a
 * mesma senha, mais o caminho das aulas na Hotmart. `brain` diz o que aconteceu do lado da BRAIN.
 */
export function sendMvaAccessEmail(input: {
  name: string;
  email: string;
  password: string;
  brain: 'created' | 'password_set' | 'existing' | 'unavailable';
}) {
  const first = escape(input.name.split(' ')[0] || input.name);
  const brainUrl = (process.env.BRAIN_URL || 'https://s4.brainexperts.com.br').replace(/\/$/, '');
  const sameForBoth = input.brain === 'created' || input.brain === 'password_set';
  const brainNote =
    input.brain === 'existing'
      ? 'Ya tenías cuenta en la BRAIN: entra con tu contraseña de siempre. Si no la recuerdas, usa "¿Olvidaste tu contraseña?" en la pantalla de entrada.'
      : input.brain === 'unavailable'
        ? 'El acceso a la BRAIN te llega en un correo aparte en unos minutos (remitente "Brain IA").'
        : undefined;

  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;color:#0e1729;line-height:1.2;">¡Hola, ${first}! Tu acceso está listo 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#32425f;">
      Ya eres parte de <strong>Máquina de Ventas Automáticas (MVA)</strong>. ${sameForBoth ? 'Entras al catálogo y a la BRAIN con <strong>el mismo correo y la misma contraseña</strong>:' : 'Estos son tus datos de acceso al catálogo:'}
    </p>

    <div style="background:#e6edf7;border:1px solid #cbd6ea;border-radius:16px;padding:20px 22px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1b3a6b;margin-bottom:12px;">Tus datos de acceso</div>
      <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:15px;line-height:1.8;color:#16223a;">
        <tr><td style="color:#6b7d9c;padding-right:18px;">Correo</td><td><strong>${escape(input.email)}</strong></td></tr>
        <tr><td style="color:#6b7d9c;padding-right:18px;">Contraseña</td><td><code style="font-family:Menlo,Consolas,monospace;font-size:15px;background:#ffffff;border:1px solid #cbd6ea;border-radius:6px;padding:2px 8px;">${escape(input.password)}</code></td></tr>
      </table>
    </div>

    ${platformCard({
      kicker: '1 · Catálogo y comunidad',
      title: 'Plataforma MVA',
      text: 'El catálogo de productos virales, las herramientas (enlaces, presell, página para bio), la comunidad y las misiones.',
      url: `${APP_URL}/login`,
      button: 'Entrar al catálogo',
    })}
    ${platformCard({
      kicker: '2 · Inteligencia artificial',
      title: 'BRAIN',
      text: 'Los agentes de IA del curso: ofertas, anuncios, imágenes, videos, cortes y el Chat Brain. Tus créditos ya están en la cuenta.',
      url: `${brainUrl}/login`,
      button: 'Entrar a la BRAIN',
      note: brainNote,
    })}
    ${platformCard({
      kicker: '3 · Clases del curso',
      title: 'Área de miembros (Hotmart)',
      text: 'Las clases están en Hotmart. El acceso llega en un correo de Hotmart (busca "MVA" en tu bandeja, también en spam y promociones), con el botón para crear tu contraseña de Hotmart.',
      url: MEMBERS_URL,
      button: 'Ir a las clases',
    })}

    <p style="margin:12px 0 0;font-size:13.5px;line-height:1.6;color:#6b7d9c;">
      Guarda este correo. Puedes cambiar tu contraseña cuando quieras desde el perfil de cada plataforma.<br>
      ¿Dudas? Responde a este correo o usa el chat de soporte dentro de la plataforma.
    </p>`;

  return send(
    input.email,
    'Tu acceso a MVA está listo: catálogo, BRAIN y clases',
    layout(body, 'Un solo acceso para el catálogo y la BRAIN. Tus datos están adentro.'),
  );
}

/** Link para criar uma senha nova (vale 1 hora). */
export function sendPasswordResetEmail(input: { name: string; email: string; url: string }) {
  const first = escape(input.name.split(' ')[0] || input.name);
  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;color:#0e1729;line-height:1.2;">Hola, ${first}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#32425f;">
      Recibimos un pedido para cambiar la contraseña de tu cuenta en <strong>Máquina de Ventas Automáticas</strong>. Toca el botón y elige una nueva. El enlace vale por 1 hora.
    </p>
    <a href="${input.url}" style="display:inline-block;background:#1b3a6b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:12px;">Crear nueva contraseña</a>
    <p style="margin:24px 0 0;font-size:13.5px;line-height:1.6;color:#6b7d9c;">
      Si no fuiste tú, ignora este correo: tu contraseña sigue igual.<br>
      Si el botón no funciona, copia este enlace: <a href="${input.url}" style="color:#1b3a6b;">${input.url}</a>
    </p>`;
  return send(input.email, 'Cambia tu contraseña de MVA', layout(body, 'Enlace para crear una nueva contraseña. Vale por 1 hora.'));
}
