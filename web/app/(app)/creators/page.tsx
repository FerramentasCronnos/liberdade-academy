import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { CreatorsRanking } from '@/components/creators-ranking';
import { PaywallModalHost } from '@/components/creators-paywall-modal';
import { getCurrentUser } from '@/lib/session';
import { freeCreatorIds, hasCreatorsAccess } from '@/lib/creators-access';
import { listCreators, type CreatorListItem } from '@/lib/queries';

export const metadata = { title: 'Creators · MVA' };

/**
 * Creators: ranking dos 50 criadores que mais vendem no TikTok Shop US,
 * atualizado a cada 2 dias pela Kalodata. Cada linha abre o perfil do criador.
 *
 * É um acesso pago à parte (Stripe). Sem ele, a pessoa vê 3 criadores por dia
 * (girando) e o resto embaçado com cadeado; qualquer cadeado abre o pop-up de
 * assinatura com o checkout dentro.
 */
export default async function CreatorsPage({ searchParams }: { searchParams: Promise<{ paywall?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { paywall } = await searchParams;

  const locked = !hasCreatorsAccess(user);
  const creators = await listCreators(user.id).catch(() => [] as CreatorListItem[]);
  // sem assinatura: 3 por dia liberados; os outros vão embaçados com cadeado
  const freeIds = locked ? freeCreatorIds(creators.map((c) => c.id)) : [];

  return (
    <>
      <PageHeader title="Creators" subtitle="Los creadores que más venden en TikTok Shop US" />
      <CreatorsRanking creators={creators} locked={locked} freeIds={freeIds} />
      {locked && (
        <PaywallModalHost publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY} autoOpen={paywall === '1'} />
      )}
    </>
  );
}
