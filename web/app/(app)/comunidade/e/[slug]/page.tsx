import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { getCurrentUser } from '@/lib/session';
import { getSpace, listFeed, listSpaces } from '@/lib/community-data';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const space = await getSpace(slug).catch(() => null);
  return { title: space ? `${space.name} · Comunidad` : 'Comunidad' };
}

export default async function SpacePage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { slug } = await params;
  const [space, spaces] = await Promise.all([getSpace(slug), listSpaces()]);
  if (!space) notFound();

  const posts = await listFeed(user.id, slug);
  const backTo = `/comunidade/e/${slug}`;

  return (
    <>
      <PageHeader flush title={`${space.emoji} ${space.name}`} subtitle={space.description} />

      <div className="mx-auto max-w-[720px]">
        <PostComposer spaces={spaces} space={space} userName={user.name} isAdmin={user.isAdmin} />

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
    </>
  );
}
