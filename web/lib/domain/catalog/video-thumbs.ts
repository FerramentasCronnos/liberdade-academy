import { put } from '@vercel/blob';
import { prisma } from '@/lib/db';

/**
 * Capa dos vídeos de referência.
 *
 * O player do TikTok só é carregado quando a pessoa clica (muitos iframes de
 * uma vez fazem o TikTok bloquear o IP de quem está vendo). Até lá o card
 * mostra a capa oficial, obtida pelo oEmbed público do TikTok no servidor e
 * copiada pro Blob, porque a URL da capa que o TikTok entrega expira.
 *
 * O oEmbed tem limite de uso; por isso as chamadas são espaçadas e uma falha
 * só deixa a capa pra próxima execução (o card usa a foto do produto enquanto
 * isso).
 */
const GAP_MS = 700;
const USER_AGENT = 'Mozilla/5.0 (compatible; MVA-catalog/1.0; +https://catalogo.s4accelerator.com)';

/**
 * Vídeo apagado ou privado no TikTok: o oEmbed responde 400/404 e nunca vai ter
 * capa. A linha recebe este marcador (string vazia) pra sair da fila de
 * pendentes; a UI trata vazio como "sem capa" e usa a foto do produto.
 */
export const THUMBNAIL_UNAVAILABLE = '';
/** Uma tentativa (oEmbed + imagem) pode levar até isso; não começa outra sem essa folga. */
const ATTEMPT_HEADROOM_MS = 25_000;

type ThumbnailLookup = { url: string | null; permanent: boolean };

async function lookupThumbnail(videoUrl: string, videoId: string): Promise<ThumbnailLookup> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    // 400/404 é vídeo que não existe mais; 429/5xx é o limite ou queda do TikTok
    if (!response.ok)
      return {
        url: null,
        permanent: response.status === 404 || response.status === 400,
      };
    const data = (await response.json().catch(() => null)) as {
      thumbnail_url?: string;
    } | null;
    const source = data?.thumbnail_url;
    if (!source || !/^https?:\/\//.test(source)) return { url: null, permanent: false };
    if (!process.env.BLOB_READ_WRITE_TOKEN) return { url: source, permanent: false };

    const image = await fetch(source, { signal: AbortSignal.timeout(15_000) });
    if (!image.ok) return { url: source, permanent: false };
    const type = image.headers.get('content-type') || 'image/jpeg';
    const blob = await put(`catalog/videos/${videoId}.${type.includes('webp') ? 'webp' : 'jpg'}`, await image.blob(), {
      access: 'public',
      contentType: type,
      allowOverwrite: true,
    });
    return { url: blob.url, permanent: false };
  } catch (error) {
    console.warn('[video-thumbs] capa não obtida', videoId, error);
    return { url: null, permanent: false };
  }
}

export async function fetchVideoThumbnail(videoUrl: string, videoId: string): Promise<string | null> {
  return (await lookupThumbnail(videoUrl, videoId)).url;
}

type MissingVideo = { id: string; videoId: string; url: string };

/**
 * Laço comum: busca a capa de cada vídeo, do que mais vendeu pro que menos,
 * até o limite ou até o prazo. Vídeo que não existe mais recebe o marcador e
 * não volta pra fila. Cinco falhas seguidas (sem contar essas) provavelmente
 * são o limite do oEmbed: para e deixa pra próxima execução.
 */
async function backfill(missing: MissingVideo[], deadline: number, save: (id: string, thumbnail: string) => Promise<unknown>) {
  let done = 0;
  let failed = 0;
  let consecutive = 0;
  for (const video of missing) {
    if (Date.now() + ATTEMPT_HEADROOM_MS > deadline) break;
    const { url, permanent } = await lookupThumbnail(video.url, video.videoId);
    if (url) {
      await save(video.id, url);
      done += 1;
      consecutive = 0;
    } else if (permanent) {
      await save(video.id, THUMBNAIL_UNAVAILABLE);
      failed += 1;
    } else {
      failed += 1;
      consecutive += 1;
      if (consecutive >= 5) break;
    }
    await new Promise((resolve) => setTimeout(resolve, GAP_MS));
  }
  return { pending: missing.length, done, failed };
}

/** Preenche capas que faltam nos vídeos de referência dos produtos. Devolve quantas conseguiu. */
export async function backfillVideoThumbnails(limit = 40, deadline = Date.now() + 60_000) {
  const missing = await prisma.productVideo.findMany({
    where: { thumbnail: null },
    orderBy: { revenue: 'desc' },
    take: limit,
    select: { id: true, videoId: true, url: true },
  });
  return backfill(missing, deadline, (id, thumbnail) => prisma.productVideo.update({ where: { id }, data: { thumbnail } }));
}

/**
 * Mesmo processo para os vídeos dos criadores (Creators). O Blob guarda por
 * id do vídeo, então um vídeo que aparece nos dois lugares reaproveita a capa.
 */
export async function backfillCreatorVideoThumbnails(limit = 40, deadline = Date.now() + 60_000) {
  const missing = await prisma.creatorVideo.findMany({
    where: { thumbnail: null },
    orderBy: { revenue: 'desc' },
    take: limit,
    select: { id: true, videoId: true, url: true },
  });
  return backfill(missing, deadline, (id, thumbnail) => prisma.creatorVideo.update({ where: { id }, data: { thumbnail } }));
}
