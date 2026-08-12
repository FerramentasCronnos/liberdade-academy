import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { getCurrentUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // pode ser null no catálogo, que é visível sem login
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}
