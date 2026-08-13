import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { AdVault, type AdCreative } from '@/components/ad-vault';
import { getUserId, isAdmin } from '@/lib/session';
import { AD_CATEGORIES, listAds } from '@/lib/queries';

export const metadata = { title: 'Baúl de Anuncios · Liberdade Academy' };

type Search = Promise<{ categoria?: string }>;

export default async function AdsPage({ searchParams }: { searchParams: Search }) {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const { categoria = 'todos' } = await searchParams;

  const [ads, admin] = await Promise.all([
    listAds(categoria).catch(() => [] as AdCreative[]),
    isAdmin(userId).catch(() => false),
  ]);

  return (
    <>
      <PageHeader
        title="Baúl de Anuncios"
        subtitle="Creativos listos para usar en tus campañas"
      />

      <div className="mx-auto max-w-[1240px] px-5 pb-12 pt-2 sm:px-8">
        <AdVault
          ads={ads}
          isAdmin={admin}
          categories={AD_CATEGORIES}
          activeCategory={categoria}
        />
      </div>
    </>
  );
}
