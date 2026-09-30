import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyAnnouncement } from '@/lib/community-data';

/**
 * Reenvia o e-mail de um anúncio. `?postId=` ou `?latest=1` (o mais recente).
 * `?to=a@x.com,b@y.com` limita a esses endereços (não marca como enviado).
 * `?at=2026-10-01T13:00:00Z` agenda o (re)envio para todos nessa hora.
 * Protegido pelo CRON_SECRET, como as demais rotas administrativas.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  let postId = params.get('postId');
  if (!postId && params.get('latest')) {
    const latest = await prisma.post.findFirst({
      where: { space: { kind: 'announcements' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });
    postId = latest?.id ?? null;
  }
  if (!postId) return NextResponse.json({ message: 'Informe postId ou latest=1.' }, { status: 400 });

  const at = params.get('at');
  if (at) {
    const when = new Date(at);
    if (Number.isNaN(when.getTime())) return NextResponse.json({ message: 'Data inválida.' }, { status: 400 });
    await prisma.post.update({ where: { id: postId }, data: { notifyAt: when, notifyEmail: true, notifiedAt: null } });
    return NextResponse.json({ postId, scheduledFor: when.toISOString() });
  }

  const only = (params.get('to') || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const result = await notifyAnnouncement(postId, only);
  return NextResponse.json({ postId, ...result }, { status: result.error ? 502 : 200 });
}
