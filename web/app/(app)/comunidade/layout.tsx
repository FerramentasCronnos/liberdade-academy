import { redirect } from 'next/navigation';
import { CommunityShell } from '@/components/community/shell';
import { prisma } from '@/lib/db';
import { CommunityCard } from '@/components/community/community-card';
import { getCommunitySidebar, listSpaces, publishDueAnnouncements } from '@/lib/community-data';
import { getCurrentUser } from '@/lib/session';

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // sem cron frequente no plano atual, quem abre a comunidade dispara os
  // anúncios agendados que venceram (uma consulta indexada, barata)
  await publishDueAnnouncements().catch(() => undefined);

  // a presença do "online agora" é marcada no layout do app (todas as telas)

  const [spaces, sidebar, openTickets] = await Promise.all([
    listSpaces(),
    getCommunitySidebar().catch(() => null),
    prisma.ticket.count({
      where: user.isAdmin
        ? { status: { not: 'resuelto' } }
        : { userId: user.id, status: { not: 'resuelto' } },
    }),
  ]);

  return (
    <CommunityShell
      spaces={spaces}
      isAdmin={user.isAdmin}
      openTickets={openTickets}
      rail={sidebar ? <CommunityCard data={sidebar} /> : undefined}
    >
      {children}
    </CommunityShell>
  );
}
