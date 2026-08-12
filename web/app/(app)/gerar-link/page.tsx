import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Gerar Link de Afiliado · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Gerar Link de Afiliado"
      subtitle="Crie seu link rastreável por marketplace"
      needs={['Conta de afiliado em Shopee, Mercado Livre e Amazon','Credenciais de API de cada programa','Armazenamento seguro das credenciais por usuário']}
    />
  );
}
