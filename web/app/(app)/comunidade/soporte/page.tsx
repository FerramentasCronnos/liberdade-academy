import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { NewTicket, TicketList } from '@/components/community/tickets';
import { getCurrentUser } from '@/lib/session';
import { listTickets } from '@/lib/community-data';

export const metadata = { title: 'Soporte · Comunidad' };

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tickets = await listTickets(user.id, user.isAdmin);
  const waiting = tickets.filter((t) => t.awaitingSupport).length;

  return (
    <>
      <PageHeader flush
        title={user.isAdmin ? 'Tickets de soporte' : 'Soporte'}
        subtitle={
          user.isAdmin
            ? waiting ? `${waiting} ${waiting === 1 ? 'ticket espera' : 'tickets esperan'} respuesta` : 'Todo respondido'
            : 'Habla directo con el equipo. Solo tú ves tus tickets.'
        }
        action={<NewTicket />}
      />
      <div className="mx-auto max-w-[720px]">
        <TicketList tickets={tickets} forSupport={user.isAdmin} />
      </div>
    </>
  );
}
