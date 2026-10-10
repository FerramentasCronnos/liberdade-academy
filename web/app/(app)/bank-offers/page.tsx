import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { CreatorsRanking } from '@/components/creators-ranking';
import { getUserId } from '@/lib/session';
import { listCreators, type CreatorListItem } from '@/lib/queries';

export const metadata = { title: 'Bank Offers · MVA' };

/**
 * Bank Offers: ranking dos 50 criadores que mais vendem no TikTok Shop US,
 * atualizado a cada 2 dias pela Kalodata. Cada linha abre o perfil do criador.
 */
export default async function BankOffersPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const creators = await listCreators(userId).catch(() => [] as CreatorListItem[]);

  return (
    <>
      <PageHeader title="Bank Offers" subtitle="Los 50 creadores que más venden en TikTok Shop US" />
      <CreatorsRanking creators={creators} />
    </>
  );
}
