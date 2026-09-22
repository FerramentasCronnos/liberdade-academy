import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PostCard } from '@/components/post-card';
import { Comments } from '@/components/community/comments';
import { IconArrowLeft } from '@/components/icons';
import { getCurrentUser } from '@/lib/session';
import { getPost } from '@/lib/community-data';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const data = await getPost(id, '').catch(() => null);
  const title = data?.post.title || data?.post.content.slice(0, 60);
  return { title: title ? `${title} · Comunidad` : 'Publicación' };
}

export default async function PostPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const data = await getPost(id, user.id);
  if (!data) notFound();

  const { post, comments } = data;
  const back = post.space ? `/comunidade/e/${post.space.slug}` : '/comunidade';

  return (
    <>
      <PageHeader title={post.space ? `${post.space.emoji} ${post.space.name}` : 'Publicación'} />

      <div className="mx-auto max-w-[760px] px-5 pb-12 sm:px-8">
        <Link href={back} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]">
          <IconArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <PostCard post={post} viewerId={user.id} viewerIsAdmin={user.isAdmin} detail backTo={back} />
        <Comments postId={post.id} comments={comments} />
      </div>
    </>
  );
}
