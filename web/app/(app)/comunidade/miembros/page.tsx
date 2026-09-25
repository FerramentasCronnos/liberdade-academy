import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { MembersGrid } from '@/components/community/members';
import { getUserId, isAdmin } from '@/lib/session';
import { listMembers } from '@/lib/community-data';

export const metadata = { title: 'Miembros · Comunidad' };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect('/login');
  // diretório só para a equipe: o membro não precisa ver a lista de todos
  if (!(await isAdmin(userId))) redirect('/comunidade');

  const { q = '' } = await searchParams;
  const members = await listMembers(q.trim() || undefined);

  return (
    <>
      <PageHeader title="Miembros" subtitle={`${members.length} ${members.length === 1 ? 'persona' : 'personas'} en la comunidad`} />
      <div className="mx-auto max-w-[900px] px-5 pb-12 sm:px-8">
        <MembersGrid members={members} q={q} />
      </div>
    </>
  );
}
