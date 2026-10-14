import { redirect } from 'next/navigation';
import { getUserId } from '@/lib/session';
import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Bank Offers · MVA' };

/** Bank Offers: produtos e fornecedores próprios da MVA. Em preparação (2026-10-14). */
export default async function Page() {
  if (!(await getUserId())) redirect('/login');

  return (
    <ComingSoon
      title="Bank Offers"
      subtitle="Nuestros productos y proveedores, con condiciones exclusivas para la comunidad"
      needs={[
        'Catálogo de productos propios de MVA',
        'Proveedores verificados y sus condiciones',
        'Enlaces y materiales para promocionar',
      ]}
    />
  );
}
