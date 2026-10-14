import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { CreatorsRanking } from '@/components/creators-ranking';
import { CreatorsPaywall } from '@/components/creators-paywall';
import { getCurrentUser } from '@/lib/session';
import { hasCreatorsAccess } from '@/lib/creators-access';
import { listCreators, type CreatorListItem } from '@/lib/queries';

export const metadata = { title: 'Creators · MVA' };

/**
 * Creators: ranking dos 50 criadores que mais vendem no TikTok Shop US,
 * atualizado a cada 2 dias pela Kalodata. Cada linha abre o perfil do criador.
 *
 * É um acesso pago à parte (Stripe). Sem ele, a página aparece embaçada atrás
 * do paywall — só os 10 primeiros, para não mandar o ranking inteiro ao HTML.
 */
export default async function CreatorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const locked = !hasCreatorsAccess(user);
  const creators = await listCreators(user.id).catch(() => [] as CreatorListItem[]);

  return (
    <>
      <PageHeader title="Creators" subtitle="Los 50 creadores que más venden en TikTok Shop US" />
      <CreatorsPaywall locked={locked}>
        <CreatorsRanking creators={locked ? creators.slice(0, 10) : creators} />
      </CreatorsPaywall>
    </>
  );
}
