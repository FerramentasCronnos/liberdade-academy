import { createHmac, randomBytes } from 'node:crypto';

/**
 * Arquivos públicos do catálogo (fotos de produto, capas, avatares, anexos).
 *
 * Ficam no Cloudflare R2 (bucket catalogo-media). A leitura sai direto do
 * bucket pelo domínio MEDIA_PUBLIC_URL; o envio passa pelo worker
 * MEDIA_UPLOAD_URL (pasta media-worker), que só aceita um link assinado com
 * MEDIA_UPLOAD_SECRET. Antes era o Vercel Blob, que foi suspenso no plano grátis.
 */

const publicBase = () => (process.env.MEDIA_PUBLIC_URL || '').replace(/\/+$/, '');
const uploadBase = () => (process.env.MEDIA_UPLOAD_URL || '').replace(/\/+$/, '');

export function mediaConfigured(): boolean {
  return Boolean(publicBase() && uploadBase() && process.env.MEDIA_UPLOAD_SECRET);
}

/** URL de arquivo nosso (R2 novo ou Vercel Blob antigo) — para aceitar anexos vindos do navegador. */
export function isOwnMediaUrl(url: string): boolean {
  if (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(url)) return true;
  const base = publicBase();
  return Boolean(base) && url.startsWith(`${base}/`);
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

/** "posts/foto.jpg" → "posts/foto-k3j9x2.jpg" (como o addRandomSuffix do Blob). */
export function withRandomSuffix(pathname: string): string {
  const suffix = randomBytes(6).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const dot = pathname.lastIndexOf('.');
  const slash = pathname.lastIndexOf('/');
  return dot > slash ? `${pathname.slice(0, dot)}-${suffix}${pathname.slice(dot)}` : `${pathname}-${suffix}`;
}

/** Link de envio válido por `ttlSeconds` para um arquivo de até `maxBytes`. */
export function signUpload(key: string, contentType: string, maxBytes: number, ttlSeconds = 600) {
  const secret = process.env.MEDIA_UPLOAD_SECRET;
  if (!mediaConfigured() || !secret) throw new Error('Almacenamiento de archivos no configurado.');
  const exp = String(Math.floor(Date.now() / 1000) + ttlSeconds);
  const max = String(maxBytes);
  const sig = createHmac('sha256', secret).update(`PUT\n${key}\n${exp}\n${contentType}\n${max}`).digest('hex');
  const query = new URLSearchParams({ exp, ct: contentType, max, sig });
  return {
    uploadUrl: `${uploadBase()}/${encodeKey(key)}?${query}`,
    url: `${publicBase()}/${encodeKey(key)}`,
  };
}

/**
 * Grava um arquivo a partir do servidor e devolve a URL pública.
 * `randomSuffix` evita sobrescrever (uploads de usuário); sem ele o caminho é
 * fixo e a foto nova substitui a anterior (imagens sincronizadas).
 */
export async function putPublic(
  pathname: string,
  body: Blob | ArrayBuffer | Uint8Array,
  options: { contentType: string; randomSuffix?: boolean },
): Promise<{ url: string }> {
  const key = options.randomSuffix ? withRandomSuffix(pathname) : pathname;
  const data = body instanceof Blob ? await body.arrayBuffer() : body;
  const size = data.byteLength;
  const { uploadUrl, url } = signUpload(key, options.contentType, Math.max(size, 1), 120);
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': options.contentType },
    body: data as BodyInit,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message || `Error al guardar el archivo (${response.status}).`);
  }
  return { url };
}
