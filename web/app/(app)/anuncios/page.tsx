import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { AdVaultVideos } from '@/components/ad-vault-videos';
import { getUserId } from '@/lib/session';
import { listReferenceVideos, type ReferenceVideoView } from '@/lib/queries';

export const metadata = { title: 'Baúl de Anuncios · MVA' };

/**
 * Baúl de Anuncios: os vídeos de referência de todas as ofertas do catálogo
 * numa vitrine só de vídeos, para inspiração.
 */
export default async function AdsPage() {
  if (!(await getUserId())) redirect('/login');

  const videos = await listReferenceVideos().catch(() => [] as ReferenceVideoView[]);

  return (
    <>
      <PageHeader
        title="Baúl de Anuncios"
        subtitle="Los videos de creadores que más vendieron cada oferta del catálogo"
      />
      <AdVaultVideos videos={videos} />
    </>
  );
}
