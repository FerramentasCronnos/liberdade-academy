import { put } from '@vercel/blob';
import { prisma } from '@/lib/db';

/**
 * Foto de perfil dos criadores.
 *
 * A Kalodata não entrega a foto e a página do TikTok bloqueia robôs. O
 * unavatar.io resolve a foto pública pelo @ (serviço gratuito, com cache);
 * copiamos pro Blob porque a URL deles não é garantida. Quando não acha,
 * guardamos '' para não tentar de novo a cada execução; a UI mostra iniciais.
 */
const GAP_MS = 600;

export async function fetchCreatorAvatar(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;
  try {
    const response = await fetch(`https://unavatar.io/tiktok/${encodeURIComponent(clean)}?fallback=false`, {
      headers: { 'User-Agent': 'MVA-catalog/1.0' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const blob = await response.blob();
    if (blob.size < 500) return null; // placeholder minúsculo = não achou
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
    const stored = await put(`creators/${clean}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`, blob, {
      access: 'public',
      contentType: type,
      allowOverwrite: true,
    });
    return stored.url;
  } catch (error) {
    console.warn('[creator-avatars] falhou', clean, error);
    return null;
  }
}

/** Preenche fotos que faltam (avatar null), do melhor ranqueado pro pior. */
export async function backfillCreatorAvatars(limit = 60, deadline = Date.now() + 60_000) {
  const missing = await prisma.creator.findMany({
    where: { avatar: null, active: true },
    orderBy: [{ rank: 'asc' }, { revenue: 'desc' }],
    take: limit,
    select: { id: true, handle: true },
  });
  let done = 0;
  let notFound = 0;
  for (const creator of missing) {
    if (Date.now() > deadline) break;
    const url = await fetchCreatorAvatar(creator.handle);
    await prisma.creator.update({ where: { id: creator.id }, data: { avatar: url ?? '' } });
    if (url) done += 1;
    else notFound += 1;
    await new Promise((resolve) => setTimeout(resolve, GAP_MS));
  }
  return { pending: missing.length, done, notFound };
}
