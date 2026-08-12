import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { TemplateStudio } from '@/components/template-studio';
import { apiFetch, getToken } from '@/lib/session';
import type { OfferTemplate } from '@/lib/affiliate';

export const metadata = { title: 'Templates de Ofertas · Liberdade Academy' };

export default async function TemplatesPage() {
  if (!(await getToken())) redirect('/login');

  const data = await apiFetch<{ templates: OfferTemplate[] }>('/templates').catch(() => null);
  const templates = data?.templates ?? [];

  return (
    <>
      <PageHeader
        title="Templates de Ofertas"
        subtitle="Monte a mensagem pronta para suas listas de transmissão"
      />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <TemplateStudio templates={templates} />
      </div>
    </>
  );
}
