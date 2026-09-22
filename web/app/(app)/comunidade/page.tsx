import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { listFeed, listSpaces } from '@/lib/community-data';

export const metadata = { title: 'Comunidad · Liberdade Academy' };

export default async function CommunityHome({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { tag } = await searchParams;
  const [spaces, posts, me] = await Promise.all([
    listSpaces(),
    listFeed(user.id, undefined, tag || undefined),
    prisma.user.findUnique({ where: { id: user.id }, select: { introducedAt: true } }),
  ]);

  return (
    <div className="mx-auto max-w-[760px] px-5 pb-12 pt-6 sm:px-8">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-[var(--text)]">Feed</h1>
          <p className="text-[13.5px] text-[var(--text-muted)]">Lo último de todos los espacios</p>
        </div>
        <ThemeToggle />
      </header>

      {!me?.introducedAt && (
        <Link
          href="/comunidade/e/presentaciones"
          className="mb-4 flex items-center gap-4 rounded-[22px] p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]"
          style={{ background: 'linear-gradient(135deg,#c9e9d6 0%,#a9dcc0 100%)', color: '#1f3d2e' }}
        >
          <span className="text-3xl" aria-hidden>👋</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[18px] font-semibold">Estás en el lugar correcto. Preséntate.</span>
            <span className="block text-[13.5px] opacity-80">Una línea alcanza: qué haces y qué te trajo aquí.</span>
          </span>
          <span className="shrink-0 rounded-full bg-white/60 px-3.5 py-1.5 text-[12.5px] font-semibold">Ir →</span>
        </Link>
      )}

      <PostComposer spaces={spaces} user={{ name: user.name, avatar: user.avatar, isAdmin: user.isAdmin }} />

      {tag && (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          Mostrando <span className="rounded-full bg-[var(--violet-soft)] px-2.5 py-1 font-semibold text-[var(--brand)]">#{tag}</span>
          <Link href="/comunidade" className="font-semibold underline-offset-2 hover:underline">Quitar filtro</Link>
        </p>
      )}

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
  );
}
