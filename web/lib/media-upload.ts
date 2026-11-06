'use client';

/**
 * Envio direto do navegador para o armazenamento (R2): o servidor só assina
 * (/api/upload), o arquivo não passa pela Vercel. Substitui o upload() do
 * Vercel Blob, com o mesmo retorno ({ url }).
 */
export async function uploadFile(pathname: string, file: File | Blob, contentType?: string): Promise<{ url: string }> {
  const type = contentType || file.type || 'application/octet-stream';
  const sign = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathname, contentType: type, size: file.size }),
  });
  const signed = (await sign.json().catch(() => null)) as { uploadUrl?: string; url?: string; message?: string } | null;
  if (!sign.ok || !signed?.uploadUrl || !signed.url) throw new Error(signed?.message || 'No autorizado.');

  const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body: file });
  if (!put.ok) {
    const detail = (await put.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message || `Error al subir (${put.status}).`);
  }
  return { url: signed.url };
}
