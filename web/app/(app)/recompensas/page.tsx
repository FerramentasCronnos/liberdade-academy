import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Recompensas · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Recompensas"
      subtitle="Troque seus pontos por prêmios"
      needs={['Modelo Reward e Redemption no Postgres','Catálogo de prêmios com estoque e custo em pontos','Fluxo de resgate e acompanhamento da entrega']}
    />
  );
}
