import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { ChatSpace } from '@/components/community/chat';
import { SpaceHero } from '@/components/community/space-hero';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { getSpace, listChat, listFeed, listSpaces } from '@/lib/community-data';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const space = await getSpace(slug).catch(() => null);
  return { title: space ? `${space.name} · Comunidad` : 'Comunidad' };
}

export default async function SpacePage({ params, searchParams }: { params: Params; searchParams: Promise<{ tag?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { slug } = await params;
  const { tag } = await searchParams;
  const [space, spaces, members] = await Promise.all([getSpace(slug), listSpaces(), prisma.user.count()]);
  if (!space) notFound();

  const viewer = { name: user.name, avatar: user.avatar, isAdmin: user.isAdmin };

  if (space.kind === 'chat') {
    const messages = await listChat(user.id, slug);
    return <ChatSpace space={space} messages={messages} members={members} viewerId={user.id} viewerIsAdmin={user.isAdmin} />;
  }

  const posts = await listFeed(user.id, slug, tag || undefined);
  const backTo = `/comunidade/e/${slug}`;
  const pill = space.kind === 'intro' ? 'Nuevos miembros' : space.kind === 'announcements' ? 'Del equipo' : undefined;
  const canPost = space.kind !== 'announcements' || user.isAdmin;

  return (
    <div className="mx-auto max-w-[900px] px-5 pb-12 pt-6 sm:px-8">
      <SpaceHero
        space={space}
        pill={pill}
        members={members}
        action={
          canPost ? (
            <a href="#composer" className="rounded-xl bg-[var(--text)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--bg-elevated)] transition hover:opacity-90">
              Nueva publicación
            </a>
          ) : undefined
        }
      />

      <div className="mx-auto mt-6 max-w-[760px]">
        <PostComposer spaces={spaces} space={space} user={viewer} />

        {tag && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
            Mostrando <span className="rounded-full bg-[var(--violet-soft)] px-2.5 py-1 font-semibold text-[var(--brand)]">#{tag}</span>
            <Link href={backTo} className="font-semibold underline-offset-2 hover:underline">Quitar filtro</Link>
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={user.id} viewerIsAdmin={user.isAdmin} backTo={backTo} />
          ))}
          {posts.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center">
              <p className="font-display text-lg font-semibold text-[var(--text)]">
                {space.kind === 'intro' ? 'Nadie se presentó todavía' : 'Este espacio está vacío'}
              </p>
              <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
                {space.kind === 'intro' ? 'Rompe el hielo: cuéntanos quién eres.' : 'Sé la primera en publicar aquí.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
