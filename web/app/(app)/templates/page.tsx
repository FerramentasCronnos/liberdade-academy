import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { TemplateStudio } from '@/components/template-studio';
import { getUserId } from '@/lib/session';
import { listTemplates } from '@/lib/queries';
import type { OfferTemplate } from '@/lib/affiliate';

export const metadata = { title: 'Plantillas de Ofertas · Liberdade Academy' };

export default async function TemplatesPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');

  const templates = await listTemplates(userId).catch(() => [] as OfferTemplate[]);

  return (
    <>
      <PageHeader
        title="Plantillas de Ofertas"
        subtitle="Arma el mensaje listo para tus listas de difusión"
      />

      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-2 sm:px-8">
        <TemplateStudio templates={templates} />
      </div>
    </>
  );
}
