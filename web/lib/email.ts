/**
 * Envio de e-mails pela Resend.
 *
 * Chamada direta à API HTTP em vez do SDK: é um único endpoint e evita mais
 * uma dependência. A chave vem de RESEND_API_KEY; sem ela, o envio é pulado
 * e devolve erro em vez de derrubar o fluxo que chamou.
 */
const APP_URL = process.env.APP_URL || 'https://liberdade-academy.vercel.app';
const FROM = process.env.EMAIL_FROM || 'Liberdade Academy <onboarding@resend.dev>';

interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY não configurada' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
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
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;letter-spacing:-0.3px;color:#17143a;line-height:1;">Liberdade</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#6d5ce7;margin-top:6px;">Academy</div>
    </div>`;
}

function layout(body: string) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Liberdade Academy</title></head>
<body style="margin:0;padding:0;background:#f3f1fb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:22px;padding:40px 36px;font-family:Helvetica,Arial,sans-serif;color:#2b2846;">
        <tr><td>${brand()}${body}</td></tr>
      </table>
      <p style="max-width:560px;margin:20px auto 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8b87a6;text-align:center;line-height:1.5;">
        Recibiste este correo porque adquiriste acceso a Liberdade Academy.<br>Si no fuiste tú, puedes ignorarlo.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/** Boas-vindas com as credenciais. Em espanhol, como a plataforma. */
export function sendAccessEmail(input: { name: string; email: string; password: string }) {
  const first = escape(input.name.split(' ')[0] || input.name);
  const loginUrl = `${APP_URL}/login`;

  const body = `
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;color:#17143a;line-height:1.2;">¡Bienvenida, ${first}! 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4668;">
      Tu acceso a <strong>Liberdade Academy</strong> ya está listo. Adentro vas a encontrar el catálogo de productos virales, las páginas de presell, la comunidad y las misiones para ganar puntos.
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

  return send(input.email, 'Tu acceso a Liberdade Academy está listo', layout(body));
}
