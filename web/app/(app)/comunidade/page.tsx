import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { listFeed, listSpaces } from '@/lib/community-data';

export const metadata = { title: 'Comunidad · Liberdade Academy' };

export default async function CommunityHome() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [spaces, posts, me] = await Promise.all([
    listSpaces(),
    listFeed(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { introducedAt: true } }),
  ]);

  return (
    <>
      <PageHeader flush title="Comunidad" subtitle="Lo último de todos los espacios" />

      <div className="mx-auto max-w-[720px]">
        {!me?.introducedAt && (
          <Link
            href="/comunidade/e/presentaciones"
            className="mb-4 flex items-center gap-3 rounded-[22px] bg-[image:var(--sidebar-bg)] p-5 text-white shadow-[var(--shadow-lift)] transition hover:opacity-95"
          >
            <span className="text-3xl" aria-hidden>👋</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[17px] font-semibold">¿Nueva por aquí? Preséntate</span>
              <span className="block text-[13px] text-white/75">Cuéntanos quién eres y qué quieres lograr. La comunidad te da la bienvenida.</span>
            </span>
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold">Ir →</span>
          </Link>
        )}

        <PostComposer spaces={spaces} userName={user.name} isAdmin={user.isAdmin} />

        <div className="mt-4 flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={user.id} viewerIsAdmin={user.isAdmin} />
          ))}
          {posts.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center">
              <p className="font-display text-lg font-semibold text-[var(--text)]">Aún no hay publicaciones</p>
              <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">Sé la primera en compartir algo con la comunidad.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
