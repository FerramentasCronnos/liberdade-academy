'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getUserId, isAdmin } from '@/lib/session';

/**
 * Ações administrativas do acesso Creators.
 *
 * Mesma regra das demais ações de admin: a checagem é no servidor, porque um
 * membro logado consegue chamar a ação direto mesmo sem ver o botão.
 */
export type CreatorsAccessState = { error?: string; ok?: string };

async function requireAdmin() {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return null;
  return userId;
}

/** Liga ou desliga o acesso de um membro. Ligar pela administração não tem vencimento. */
export async function toggleCreatorsAccess(formData: FormData) {
  if (!(await requireAdmin())) return;

  const id = String(formData.get('id') || '');
  const enable = formData.get('enable') === 'on';
  if (!id) return;

  await prisma.user.update({
    where: { id },
    data: {
      creatorsAccess: enable,
      // desligar carimba a data para o histórico; ligar na mão não vence
      creatorsAccessUntil: enable ? null : new Date(),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/creators');
}

/** Define (ou limpa) a data de vencimento do acesso de um membro. */
export async function setCreatorsAccessUntil(
  _prev: CreatorsAccessState,
  formData: FormData,
): Promise<CreatorsAccessState> {
  if (!(await requireAdmin())) return { error: 'Acceso restringido.' };

  const id = String(formData.get('id') || '');
  const raw = String(formData.get('until') || '').trim();
  if (!id) return { error: 'Miembro inválido.' };

  let until: Date | null = null;
  if (raw) {
    // o input type=date manda YYYY-MM-DD; fim do dia para o acesso valer o dia inteiro
    until = new Date(`${raw}T23:59:59.999Z`);
    if (Number.isNaN(until.getTime())) return { error: 'Fecha inválida.' };
  }

  await prisma.user.update({
    where: { id },
    data: { creatorsAccess: true, creatorsAccessUntil: until },
  });

  revalidatePath('/admin');
  revalidatePath('/creators');
  return { ok: until ? `Acceso hasta ${raw}.` : 'Acceso sin vencimiento.' };
}
