import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/db';

/**
 * Capa de um espaço da comunidade.
 *   curl -F slug=trafico -F file=@trafico.jpg …/api/admin/spaces
 * Envia a arte para o Blob e grava a URL no espaço. `-F clear=1` remove.
 * Protegido pelo CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const form = await request.formData();
  const slug = String(form.get('slug') || '').trim();
  const space = await prisma.space.findUnique({ where: { slug } });
  if (!space) return NextResponse.json({ message: `Espacio "${slug}" no existe.` }, { status: 404 });

  if (form.get('clear')) {
    await prisma.space.update({ where: { slug }, data: { coverImage: null } });
    return NextResponse.json({ ok: true, slug, coverImage: null });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ message: 'Envíe el archivo en "file".' }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ message: 'Imagen mayor a 3 MB.' }, { status: 400 });

  const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const blob = await put(`spaces/${slug}.${ext}`, file, { access: 'public', contentType: file.type, allowOverwrite: true });
  await prisma.space.update({ where: { slug }, data: { coverImage: blob.url } });

  return NextResponse.json({ ok: true, slug, coverImage: blob.url });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }
  const spaces = await prisma.space.findMany({ orderBy: { order: 'asc' }, select: { slug: true, name: true, coverImage: true } });
  return NextResponse.json({ spaces });
}
