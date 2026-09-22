import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { TicketThread } from '@/components/community/tickets';
import { IconArrowLeft } from '@/components/icons';
import { getCurrentUser } from '@/lib/session';
import { getTicket } from '@/lib/community-data';

type Params = Promise<{ id: string }>;

export const metadata = { title: 'Ticket · Soporte' };

export default async function TicketPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const ticket = await getTicket(id, user.id, user.isAdmin);
  if (!ticket) notFound();

  return (
    <>
      <PageHeader flush title="Soporte" />
      <div className="mx-auto max-w-[720px]">
        <Link href="/comunidade/soporte" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]">
          <IconArrowLeft className="h-4 w-4" />
          {user.isAdmin ? 'Todos los tickets' : 'Mis tickets'}
        </Link>
        <TicketThread ticket={ticket} viewerId={user.id} forSupport={user.isAdmin} />
      </div>
    </>
  );
}
