import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getUserId } from '@/lib/session';
import { freeCreatorIds, hasCreatorsAccess } from '@/lib/creators-access';
import { prisma } from '@/lib/db';
import { PaywallModalHost } from '@/components/creators-paywall-modal';
import { getCreator } from '@/lib/queries';
import { PageHeader } from '@/components/page-header';
import { CreatorProfile } from '@/components/creator-profile';
import { IconArrowLeft } from '@/components/icons';

// Next 16: params é uma Promise e precisa de await.
type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const userId = await getUserId();
  const { id } = await params;
  const creator = userId ? await getCreator(id, userId).catch(() => null) : null;
  return { title: creator ? `${creator.nickname || `@${creator.handle}`} · Creators · MVA` : 'Creador · MVA' };
}

/** Perfil de um criador do ranking Creators (dados da Kalodata). */
export default async function CreatorPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const locked = !hasCreatorsAccess(user);
  if (locked) {
    // sem assinatura só os criadores grátis do dia abrem; os outros voltam ao ranking com o pop-up
    const ids = await prisma.creator.findMany({ where: { active: true }, orderBy: [{ rank: 'asc' }, { revenue: 'desc' }], select: { id: true } });
    if (!freeCreatorIds(ids.map((c) => c.id)).includes(id)) redirect('/creators?paywall=1');
  }
  const creator = await getCreator(id, user.id).catch(() => null);
  if (!creator) notFound();

  return (
    <>
      <PageHeader title="Creador" subtitle="Creators · TikTok Shop" />

      <div className="px-5 pb-12 sm:px-8">
        <Link
          href="/creators"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <IconArrowLeft className="h-4 w-4" />
          Volver al ranking
        </Link>

        <CreatorProfile creator={creator} locked={locked} />
        {locked && <PaywallModalHost publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY} />}
      </div>
    </>
  );
}
