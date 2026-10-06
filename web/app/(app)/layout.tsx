import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { AssistantWidget } from '@/components/assistant-widget';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserId } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Segunda barreira depois do proxy. Checa só o cookie: com o banco fora do
  // ar, getCurrentUser devolve null e mandar para /login viraria um loop, já
  // que o login vê o cookie válido e devolve para /catalogo.
  if (!(await getUserId())) redirect('/login');
  const user = await getCurrentUser();
  // Chat de suporte com IA só onde ASSISTANT_ENABLED=1 (preview, por ora)
  const assistant = process.env.ASSISTANT_ENABLED === '1';

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} assistant={assistant} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      <MobileNav />
      {assistant && <AssistantWidget />}
    </div>
  );
}
