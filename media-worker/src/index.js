/**
 * PUT /<caminho>?exp=<unix>&ct=<content-type>&max=<bytes>&sig=<hex>
 *
 * A assinatura é um HMAC-SHA256 (UPLOAD_SECRET) de "PUT\n<caminho>\n<exp>\n<ct>\n<max>",
 * feita pelo catálogo. Assim o navegador sobe o arquivo direto, sem passar
 * pelo limite de corpo da Vercel, e só com uma autorização curta.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const reply = (status, message) =>
  new Response(JSON.stringify({ message }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sameHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'PUT') return reply(405, 'Solo PUT.');
    if (!env.UPLOAD_SECRET) return reply(500, 'UPLOAD_SECRET no configurado.');

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key || key.length > 512 || key.includes('..') || key.startsWith('/')) return reply(400, 'Ruta inválida.');

    const exp = url.searchParams.get('exp') || '';
    const ct = url.searchParams.get('ct') || '';
    const max = url.searchParams.get('max') || '';
    const sig = url.searchParams.get('sig') || '';
    if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return reply(403, 'Autorización vencida.');
    const expected = await hmacHex(env.UPLOAD_SECRET, `PUT\n${key}\n${exp}\n${ct}\n${max}`);
    if (!sameHex(sig, expected)) return reply(403, 'Firma inválida.');

    const length = Number(request.headers.get('content-length') || '0');
    if (!length) return reply(411, 'Falta Content-Length.');
    if (length > Number(max)) return reply(413, 'Archivo demasiado grande.');

    await env.BUCKET.put(key, request.body, {
      httpMetadata: { contentType: ct || 'application/octet-stream', cacheControl: 'public, max-age=86400' },
    });
    return new Response(JSON.stringify({ ok: true, key }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  },
};
