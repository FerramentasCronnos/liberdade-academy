import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Analytics · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Analytics"
      subtitle="Acompanhe cliques, vendas e comissões"
      needs={['Integração com a API de relatórios da Shopee','Job de sincronização periódica dos resultados','Modelo de métricas por usuário e período']}
    />
  );
}
