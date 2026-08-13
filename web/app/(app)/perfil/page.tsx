import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ProfileForm } from '@/components/profile-form';
import { AppearanceCard } from '@/components/appearance-card';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser, getToken } from '@/lib/session';

export const metadata = { title: 'Perfil · Liberdade Academy' };

export default async function ProfilePage() {
  if (!(await getToken())) redirect('/login');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <>
      <PageHeader title="Perfil" subtitle="Tus datos, tu foto y tus redes" />

      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-5 pb-12 pt-2 sm:px-8">
        <ProfileForm user={user} />
        <AppearanceCard />

        <div className="rounded-[24px] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <LogoutButton full />
        </div>
      </div>
    </>
  );
}
