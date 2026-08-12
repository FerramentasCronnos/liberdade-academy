import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { apiFetch, getToken } from '@/lib/session';
import type { CommunityPost } from '@/lib/community';

export const metadata = { title: 'Comunidade · Liberdade Academy' };

export default async function CommunityPage() {
  if (!(await getToken())) redirect('/login');

  let posts: CommunityPost[] = [];
  let error: string | null = null;

  try {
    const data = await apiFetch<{ posts: CommunityPost[] }>('/posts');
    if (!data) redirect('/login');
    posts = data.posts;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Falha ao carregar o feed.';
  }

  return (
    <>
      <PageHeader title="Comunidade" subtitle="Dicas, resultados e dúvidas dos membros" />

      <div className="mx-auto max-w-[720px] px-5 pb-12 pt-2 sm:px-8">
        <PostComposer />

        {error && (
          <p className="mt-4 rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-[13.5px] text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
            Não consegui carregar o feed ({error}).
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {!error && posts.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 py-16 text-center">
              <p className="font-display text-lg font-semibold text-[var(--text)]">
                Nenhum post ainda
              </p>
              <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
                Seja a primeira a compartilhar algo com a comunidade.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
