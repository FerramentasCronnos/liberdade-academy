import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/db';

/**
 * Carrega as fotos das recompensas a partir de URLs.
 *
 * Baixa e regrava no Blob em vez de apontar para o site de origem: assim as
 * imagens ficam no armazenamento da própria plataforma e não quebram se a
 * fonte sair do ar ou mudar de endereço.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const photos = (await request.json().catch(() => ({}))) as Record<string, string>;
  const results: Record<string, string> = {};

  for (const [slug, url] of Object.entries(photos)) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        results[slug] = `falha ao baixar (${response.status})`;
        continue;
      }

      const blob = await put(`rewards/${slug}.jpg`, await response.blob(), {
        access: 'public',
        contentType: 'image/jpeg',
        allowOverwrite: true,
      });

      const updated = await prisma.reward.updateMany({
        where: { slug },
        data: { image: blob.url },
      });

      results[slug] = updated.count ? 'ok' : 'recompensa não encontrada';
    } catch (error) {
      results[slug] = error instanceof Error ? error.message.slice(0, 80) : 'erro';
    }
  }

  return NextResponse.json({ results });
}
