import { redirect } from 'next/navigation';
import { CommunityShell } from '@/components/community/shell';
import { prisma } from '@/lib/db';
import { listSpaces } from '@/lib/community-data';
import { getCurrentUser } from '@/lib/session';

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [spaces, openTickets] = await Promise.all([
    listSpaces(),
    prisma.ticket.count({
      where: user.isAdmin
        ? { status: { not: 'resuelto' } }
        : { userId: user.id, status: { not: 'resuelto' } },
    }),
  ]);

  return (
    <CommunityShell spaces={spaces} isAdmin={user.isAdmin} openTickets={openTickets}>
      {children}
    </CommunityShell>
  );
}
