import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Analytics · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Analytics"
      subtitle="Sigue clics, ventas y comisiones"
      needs={['Integración con la API de reportes de Shopee','Job de sincronización periódica de los resultados','Modelo de métricas por usuario y período']}
    />
  );
}
