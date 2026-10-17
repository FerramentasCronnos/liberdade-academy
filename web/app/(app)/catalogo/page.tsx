import { redirect } from 'next/navigation';
import { getUserId, isAdmin } from '@/lib/session';
import { CatalogView } from '@/components/catalog-view';
import { PageHeader } from '@/components/page-header';
import { CATALOG_REGION, toProduct } from '@/lib/api';
import { listProducts } from '@/lib/queries';
import type { Product } from '@/lib/types';

export const metadata = {
  title: 'Catálogo · MVA',
};

export default async function CatalogPage() {
  const userId = await getUserId();
  if (!userId) redirect('/login');
  // Bank Offers: só admins enquanto a dona não liberar (BANK_OFFERS_PUBLIC=1)
  const includeBankOffers = process.env.BANK_OFFERS_PUBLIC === '1' || (await isAdmin(userId));

  let products: Product[] = [];
  let error: string | null = null;

  try {
    products = (await listProducts({ region: CATALOG_REGION, includeBankOffers })).map(toProduct);
  } catch (e) {
    // API fora do ar não derruba a página; mostramos o aviso e a tela vazia,
    // nunca produto fictício.
    error = e instanceof Error ? e.message : 'Falló la carga del catálogo.';
  }

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle="Productos validados de TikTok Shop, Amazon y Shopee"
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
