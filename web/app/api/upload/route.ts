import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/session';
import { signUpload, withRandomSuffix } from '@/lib/media';

/**
 * Autoriza um envio direto do navegador ao armazenamento (R2).
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
const MAX_BYTES = 40 * 1024 * 1024;
// só as pastas que o app usa a partir do navegador
const FOLDERS = ['posts', 'support', 'tickets'];

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { pathname?: string; contentType?: string; size?: number } | null;
  const contentType = (body?.contentType || '').split(';')[0].trim().toLowerCase();
  const size = Number(body?.size);
  const [folder, ...rest] = String(body?.pathname || '').split('/');
  const name = rest.join('_').replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(-120) || 'archivo';

  if (!FOLDERS.includes(folder)) return NextResponse.json({ message: 'Ruta no permitida.' }, { status: 400 });
  if (!ALLOWED.includes(contentType)) return NextResponse.json({ message: 'Tipo de archivo no permitido.' }, { status: 400 });
  if (!(size > 0) || size > MAX_BYTES) return NextResponse.json({ message: 'Archivo mayor a 40 MB.' }, { status: 400 });

  try {
    return NextResponse.json(signUpload(withRandomSuffix(`${folder}/${name}`), contentType, size));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error al subir.' },
      { status: 500 },
    );
  }
}
