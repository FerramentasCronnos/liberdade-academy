import { CatalogView } from '@/components/catalog-view';
import { PageHeader } from '@/components/page-header';
import { CATALOG_REGION, fetchProducts } from '@/lib/api';
import type { Product } from '@/lib/types';

export const metadata = {
  title: 'Catálogo · Liberdade Academy',
};

export default async function CatalogPage() {
  let products: Product[] = [];
  let error: string | null = null;

  try {
    products = await fetchProducts({ region: CATALOG_REGION });
  } catch (e) {
    // API fora do ar não derruba a página; mostramos o aviso e a tela vazia,
    // nunca produto fictício.
    error = e instanceof Error ? e.message : 'Falló la carga del catálogo.';
  }

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle="Productos virales validados de TikTok Shop"
      />

      {error && (
        <div className="px-5 pt-2 sm:px-8">
          <div className="rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-[13.5px] text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
            No pude conectar con la API del catálogo ({error}). Verifica que el stack esté activo.
          </div>
        </div>
      )}

      <CatalogView products={products} />
    </>
  );
}
