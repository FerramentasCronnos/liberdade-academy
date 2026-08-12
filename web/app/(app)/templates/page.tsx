import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Templates de Ofertas · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Templates de Ofertas"
      subtitle="Monte mensagens prontas para divulgar"
      needs={['Modelo Template no Postgres','Editor com variáveis do produto','Preview de mensagem e cópia para WhatsApp']}
    />
  );
}
