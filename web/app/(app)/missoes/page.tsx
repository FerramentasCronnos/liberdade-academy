import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Missões · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Missões"
      subtitle="Complete tarefas e acumule pontos"
      needs={['Modelos Mission, MissionCompletion e Points no Postgres','Regras de pontuação (automática vs. com comprovação)','Upload e revisão dos prints de comprovação']}
    />
  );
}
