import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { LinkGenerator } from '@/components/link-generator';
import { LinkHistory } from '@/components/link-history';
import { getUserId } from '@/lib/session';
import { listAffiliateAccounts, listAffiliateLinks } from '@/lib/queries';
import type { AffiliateAccount, AffiliateLink } from '@/lib/affiliate';

export const metadata = { title: 'Gerar Link · Liberdade Academy' };

export default async function GenerateLinkPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const [accounts, links] = await Promise.all([
    listAffiliateAccounts(userId).catch(() => [] as AffiliateAccount[]),
    listAffiliateLinks(userId).catch(() => [] as AffiliateLink[]),
  ]);

  // só a Amazon monta link sem credencial de API
  const ready = ['amazon'];

  return (
    <>
      <PageHeader
        title="Generar Enlace de Afiliado"
        subtitle="Convierte la URL del producto en tu enlace rastreable"
      />

      <div className="mx-auto max-w-[860px] px-5 pb-12 pt-2 sm:px-8">
        <LinkGenerator accounts={accounts} ready={ready} />
        <LinkHistory links={links} />
      </div>
    </>
  );
}
