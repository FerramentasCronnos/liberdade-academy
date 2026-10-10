import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { BankOffersView } from '@/components/bank-offers-view';
import { getUserId } from '@/lib/session';
import { listReferenceVideos, type ReferenceVideoView } from '@/lib/queries';

export const metadata = { title: 'Bank Offers · MVA' };

/**
 * Bank Offers: os mesmos vídeos de referência que aparecem dentro de cada
 * oferta, reunidos numa vitrine só de vídeos para inspiração.
 */
export default async function BankOffersPage() {
  if (!(await getUserId())) redirect('/login');

  const videos = await listReferenceVideos().catch(() => [] as ReferenceVideoView[]);

  return (
    <>
      <PageHeader
        title="Bank Offers"
        subtitle="Los videos de creadores que más vendieron cada oferta del catálogo"
      />
      <BankOffersView videos={videos} />
    </>
  );
}
