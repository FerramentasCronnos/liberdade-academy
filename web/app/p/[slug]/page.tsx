import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/api';
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
    const response = await fetch(`${API_URL}/public/pages/${encodeURIComponent(slug)}`, {
      // conteúdo pode mudar a qualquer edição; 30s evita martelar a API
      next: { revalidate: 30 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { page: PublicPage };
    return data.page;
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
