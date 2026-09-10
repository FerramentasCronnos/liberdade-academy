import { redirect } from 'next/navigation';
import { getUserId } from '@/lib/session';
import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Configurar Credenciais · Liberdade Academy' };

export default async function Page() {
  if (!(await getUserId())) redirect('/login');

  return (
    <ComingSoon
      title="Configurar Credenciais"
      subtitle="Conecta tus cuentas de afiliado"
      needs={['Cifrado de las credenciales en reposo','Validación de la clave con cada marketplace','Pantalla de conexión por programa de afiliado']}
    />
  );
}
