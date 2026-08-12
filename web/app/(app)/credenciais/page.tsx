import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Configurar Credenciais · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Configurar Credenciais"
      subtitle="Conecte suas contas de afiliado"
      needs={['Criptografia das credenciais em repouso','Validação da chave junto a cada marketplace','Tela de conexão por programa de afiliado']}
    />
  );
}
