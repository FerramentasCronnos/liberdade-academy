import { CatalogView } from '@/components/catalog-view';
import { PageHeader } from '@/components/page-header';
import { fetchProducts } from '@/lib/api';
import type { Product } from '@/lib/types';

export const metadata = {
  title: 'Catálogo · Liberdade Academy',
};

export default async function CatalogPage() {
  let products: Product[] = [];
  let error: string | null = null;

  try {
    products = await fetchProducts({ region: 'BR' });
  } catch (e) {
    // API fora do ar não derruba a página; mostramos o aviso e a tela vazia,
    // nunca produto fictício.
    error = e instanceof Error ? e.message : 'Falha ao carregar o catálogo.';
  }

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle="Produtos virais validados do TikTok Shop Brasil"
      />

      {error && (
        <div className="px-5 pt-2 sm:px-8">
          <div className="rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-[13.5px] text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
            Não consegui falar com a API do catálogo ({error}). Verifique se a stack está de pé.
          </div>
        </div>
      )}

      <CatalogView products={products} />
    </>
  );
}
