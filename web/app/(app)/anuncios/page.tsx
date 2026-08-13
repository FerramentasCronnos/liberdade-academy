import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { AdVault, type AdCreative } from '@/components/ad-vault';
import { apiFetch, getToken } from '@/lib/session';

export const metadata = { title: 'Baú de Anúncios · Liberdade Academy' };

type Search = Promise<{ categoria?: string }>;

export default async function AdsPage({ searchParams }: { searchParams: Search }) {
  if (!(await getToken())) redirect('/login');

  const { categoria = 'todos' } = await searchParams;

  const data = await apiFetch<{
    isAdmin: boolean;
    categories: string[];
    ads: AdCreative[];
  }>(`/ads?category=${encodeURIComponent(categoria)}`).catch(() => null);

  return (
    <>
      <PageHeader
        title="Baú de Anúncios"
        subtitle="Criativos prontos para você usar nas suas campanhas"
      />

      <div className="mx-auto max-w-[1240px] px-5 pb-12 pt-2 sm:px-8">
        <AdVault
          ads={data?.ads ?? []}
          isAdmin={data?.isAdmin ?? false}
          categories={data?.categories ?? []}
          activeCategory={categoria}
        />
      </div>
    </>
  );
}
