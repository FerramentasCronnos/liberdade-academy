import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { presellConfig } from '@/lib/pages';
import { PublicPresell } from './public-presell';

type Params = Promise<{ slug: string }>;

interface PublicPage {
  id: string;
  kind: string;
  slug: string;
  template: string;
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

  return {
    title: page?.title ?? 'Página',
    description: page?.subtitle,
    // presell é tráfego pago: não queremos que ranqueie nem duplique conteúdo
    robots: { index: false, follow: false },
  };
}

export default async function PublicPresellPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page || page.kind !== 'presell') notFound();

  const config = presellConfig(page.config);

  return (
    <PublicPresell
      slug={page.slug}
      data={{
        template: page.template,
        title: page.title,
        subtitle: page.subtitle,
        avatar: page.avatar,
        config,
      }}
      pixelId={config.tracking.pixelId}
    />
  );
}
