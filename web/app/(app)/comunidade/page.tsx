import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { getUserId } from '@/lib/session';
import { listPosts } from '@/lib/queries';
import type { CommunityPost } from '@/lib/community';

export const metadata = { title: 'Comunidad · Liberdade Academy' };

export default async function CommunityPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  let posts: CommunityPost[] = [];
  let error: string | null = null;

  try {
    posts = (await listPosts(userId)) as CommunityPost[];
  } catch (e) {
    error = e instanceof Error ? e.message : 'Falha ao carregar o feed.';
  }

  return (
    <>
      <PageHeader title="Comunidad" subtitle="Consejos, resultados y dudas de los miembros" />

      <div className="mx-auto max-w-[720px] px-5 pb-12 pt-2 sm:px-8">
        <PostComposer />

        {error && (
          <p className="mt-4 rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-[13.5px] text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
            No pude cargar el feed ({error}).
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {!error && posts.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center">
              <p className="font-display text-lg font-semibold text-[var(--text)]">
                Aún no hay publicaciones
              </p>
              <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
                Sé la primera en compartir algo con la comunidad.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
