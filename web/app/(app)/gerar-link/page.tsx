import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { LinkGenerator } from '@/components/link-generator';
import { LinkHistory } from '@/components/link-history';
import { apiFetch, getToken } from '@/lib/session';
import type { AffiliateAccount, AffiliateLink } from '@/lib/affiliate';

export const metadata = { title: 'Gerar Link · Liberdade Academy' };

export default async function GenerateLinkPage() {
  if (!(await getToken())) redirect('/login');

  const [accountsData, linksData] = await Promise.all([
    apiFetch<{ ready: string[]; accounts: AffiliateAccount[] }>('/affiliate/accounts').catch(
      () => null,
    ),
    apiFetch<{ links: AffiliateLink[] }>('/affiliate/links').catch(() => null),
  ]);

  const accounts = accountsData?.accounts ?? [];
  const ready = accountsData?.ready ?? [];
  const links = linksData?.links ?? [];

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
