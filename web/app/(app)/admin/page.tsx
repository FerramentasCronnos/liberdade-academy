import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Tabs } from '@/components/tabs';
import { MembersPanel, type Member } from '@/components/admin/members-panel';
import { RewardsPanel } from '@/components/admin/rewards-panel';
import { KnowledgePanel } from '@/components/admin/knowledge-panel';
import { AssistantHistoryPanel } from '@/components/admin/assistant-history-panel';
import { CreatorsAccessPanel } from '@/components/admin/creators-access-panel';
import { listDocuments } from '@/lib/knowledge';
import { assistantStats, listAssistantConversations, listAssistantTicketReplies } from '@/lib/assistant-history';
import { listCreatorsAccessMembers } from '@/lib/creators-access';
import { ModerationPanel } from '@/components/admin/moderation-panel';
import { listPendingPosts } from '@/lib/community-data';
import { prisma } from '@/lib/db';
import { listRewards } from '@/lib/queries';
import { getUserId, isAdmin } from '@/lib/session';

export const metadata = { title: 'Administración · MVA' };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const userId = await getUserId();
  if (!userId) redirect('/login');
  // sem isto, bastaria digitar /admin na barra de endereço
  if (!(await isAdmin(userId))) redirect('/catalogo');

  const assistantOn = process.env.ASSISTANT_ENABLED === '1';
  const [users, rewards, docs, creatorsMembers, history, ticketReplies, stats, pending] = await Promise.all([
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
    listDocuments(),
    listCreatorsAccessMembers(),
    assistantOn ? listAssistantConversations({ take: 100 }) : Promise.resolve({ conversations: [], nextCursor: null }),
    assistantOn ? listAssistantTicketReplies({ take: 100 }) : Promise.resolve([]),
    assistantOn ? assistantStats() : Promise.resolve(null),
    listPendingPosts(),
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
          initial={tab}
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
            {
              id: 'moderacion',
              label: 'Moderación',
              count: pending.filter((p) => p.status === 'pending').length,
              content: <ModerationPanel posts={pending} />,
            },
            {
              id: 'creators',
              label: 'Creators',
              count: creatorsMembers.filter((m) => m.creatorsAccess && !m.isAdmin).length,
              content: <CreatorsAccessPanel members={creatorsMembers} />,
            },
            ...(assistantOn
              ? [
                  {
                    id: 'knowledge',
                    label: 'IA de soporte',
                    count: docs.length,
                    content: <KnowledgePanel docs={docs} />,
                  },
                  {
                    id: 'assistant-history',
                    label: 'Historial IA',
                    count: history.conversations.length + ticketReplies.length,
                    content: stats ? (
                      <AssistantHistoryPanel conversations={history.conversations} ticketReplies={ticketReplies} stats={stats} />
                    ) : null,
                  },
                ]
              : []),
          ]}
        />
      </div>
    </>
  );
}
