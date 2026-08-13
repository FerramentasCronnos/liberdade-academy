import { ComingSoon } from '@/components/coming-soon';

export const metadata = { title: 'Configurar Credenciais · Liberdade Academy' };

export default function Page() {
  return (
    <ComingSoon
      title="Configurar Credenciais"
      subtitle="Conecta tus cuentas de afiliado"
      needs={['Cifrado de las credenciales en reposo','Validación de la clave con cada marketplace','Pantalla de conexión por programa de afiliado']}
    />
  );
}
