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

export async function fetchVideoThumbnail(videoUrl: string, videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = (await response.json().catch(() => null)) as { thumbnail_url?: string } | null;
    const source = data?.thumbnail_url;
    if (!source || !/^https?:\/\//.test(source)) return null;
    if (!process.env.BLOB_READ_WRITE_TOKEN) return source;

    const image = await fetch(source, { signal: AbortSignal.timeout(15_000) });
    if (!image.ok) return source;
    const type = image.headers.get('content-type') || 'image/jpeg';
    const blob = await put(`catalog/videos/${videoId}.${type.includes('webp') ? 'webp' : 'jpg'}`, await image.blob(), {
      access: 'public',
      contentType: type,
      allowOverwrite: true,
    });
    return blob.url;
  } catch (error) {
    console.warn('[video-thumbs] capa não obtida', videoId, error);
    return null;
  }
}

/**
 * Preenche capas que faltam, do vídeo que mais vendeu pro que menos, até o
 * limite ou até o prazo. Devolve quantas conseguiu.
 */
export async function backfillVideoThumbnails(limit = 40, deadline = Date.now() + 60_000) {
  const missing = await prisma.productVideo.findMany({
    where: { thumbnail: null },
    orderBy: { revenue: 'desc' },
    take: limit,
    select: { id: true, videoId: true, url: true },
  });

  let done = 0;
  let failed = 0;
  for (const video of missing) {
    if (Date.now() > deadline) break;
    const thumbnail = await fetchVideoThumbnail(video.url, video.videoId);
    if (thumbnail) {
      await prisma.productVideo.update({ where: { id: video.id }, data: { thumbnail } });
      done += 1;
    } else {
      failed += 1;
      if (failed >= 5) break; // provavelmente limite do oEmbed: para e tenta na próxima
    }
    await new Promise((resolve) => setTimeout(resolve, GAP_MS));
  }
  return { pending: missing.length, done, failed };
}
