import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/session';

/**
 * Token para upload direto do navegador ao Blob.
 *
 * Áudios e vídeos passam fácil do limite de corpo das Server Actions, então
 * o arquivo não transita pelo servidor: aqui só se autoriza e se limita.
 */
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
];

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: 40 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: userId,
      }),
      onUploadCompleted: async () => {
        // nada a registrar: a URL entra no banco junto com a mensagem
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error al subir.' },
      { status: 400 },
    );
  }
}
