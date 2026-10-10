import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUserId } from '@/lib/session';
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
  return { title: creator ? `${creator.nickname || `@${creator.handle}`} · Bank Offers · MVA` : 'Creador · MVA' };
}

/** Perfil de um criador do ranking Bank Offers (dados da Kalodata). */
export default async function CreatorPage({ params }: { params: Params }) {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const { id } = await params;
  const creator = await getCreator(id, userId).catch(() => null);
  if (!creator) notFound();

  return (
    <>
      <PageHeader title="Creador" subtitle="Bank Offers · TikTok Shop" />

      <div className="px-5 pb-12 sm:px-8">
        <Link
          href="/bank-offers"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <IconArrowLeft className="h-4 w-4" />
          Volver al ranking
        </Link>

        <CreatorProfile creator={creator} />
      </div>
    </>
  );
}
