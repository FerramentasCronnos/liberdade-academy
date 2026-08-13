import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/api';
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
    const response = await fetch(`${API_URL}/public/pages/${encodeURIComponent(slug)}`, {
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
