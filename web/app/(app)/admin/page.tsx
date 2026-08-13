import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Tabs } from '@/components/tabs';
import { MembersPanel, type Member } from '@/components/admin/members-panel';
import { RewardsPanel } from '@/components/admin/rewards-panel';
import { prisma } from '@/lib/db';
import { listRewards } from '@/lib/queries';
import { getUserId, isAdmin } from '@/lib/session';

export const metadata = { title: 'Administración · Liberdade Academy' };

export default async function AdminPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');
  // sem isto, bastaria digitar /admin na barra de endereço
  if (!(await isAdmin(userId))) redirect('/catalogo');

  const [users, rewards] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isAdmin: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        plan: true,
        createdAt: true,
      },
    }),
    listRewards(userId),
  ]);

  const members: Member[] = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Miembros y contenido de la plataforma"
      />

      <div className="mx-auto max-w-[900px] px-5 pb-12 pt-2 sm:px-8">
        <Tabs
          tabs={[
            {
              id: 'members',
              label: 'Miembros',
              count: members.length,
              content: <MembersPanel members={members} meId={userId} />,
            },
            {
              id: 'rewards',
              label: 'Recompensas',
              count: rewards.length,
              content: <RewardsPanel rewards={rewards} />,
            },
          ]}
        />
      </div>
    </>
  );
}
