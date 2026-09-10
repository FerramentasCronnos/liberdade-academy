import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserId } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Segunda barreira depois do proxy. Checa só o cookie: com o banco fora do
  // ar, getCurrentUser devolve null e mandar para /login viraria um loop, já
  // que o login vê o cookie válido e devolve para /catalogo.
  if (!(await getUserId())) redirect('/login');
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}
