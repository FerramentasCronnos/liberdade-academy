import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { bioConfig } from '@/lib/pages';
import { BioRender } from '@/components/bio/bio-render';

type Params = Promise<{ slug: string }>;

interface PublicPage {
  kind: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  config: Record<string, unknown>;
}

async function fetchPage(slug: string): Promise<PublicPage | null> {
  try {
    const page = await prisma.landingPage.findUnique({ where: { slug } });
    if (!page || !page.published) return null;

    // contador best-effort: falhar aqui não pode impedir a página de abrir
    prisma.landingPage
      .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
      .catch(() => undefined);

    return {
      kind: page.kind,
      slug: page.slug,
      template: page.template,
      title: page.title,
      subtitle: page.subtitle ?? undefined,
      avatar: page.avatar ?? undefined,
      config: (page.config ?? {}) as Record<string, unknown>,
    } as PublicPage;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await fetchPage(slug);

  // bio é feita para ser encontrada, ao contrário do presell
  return { title: page?.title ?? 'Bio', description: page?.subtitle };
}

export default async function PublicBioPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page || page.kind !== 'bio') notFound();

  return (
    <main className="min-h-dvh">
      <div className="mx-auto min-h-dvh w-full max-w-[440px]">
        <BioRender
          data={{
            title: page.title,
            subtitle: page.subtitle,
            avatar: page.avatar,
            config: bioConfig(page.config),
          }}
        />
      </div>
    </main>
  );
}
