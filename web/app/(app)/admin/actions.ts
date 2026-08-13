'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getUserId, isAdmin } from '@/lib/session';

/**
 * Ações da área administrativa.
 *
 * Toda função confere isAdmin no servidor. Esconder o botão na interface não
 * é proteção: sem esta checagem, qualquer membro logado poderia chamar a ação
 * direto e criar uma conta de admin.
 */
export type AdminState = { error?: string; ok?: string };

async function requireAdmin() {
  const userId = await getUserId();
  if (!userId || !(await isAdmin(userId))) return null;
  return userId;
}

export async function createMember(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: 'Acceso restringido.' };

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const admin = formData.get('isAdmin') === 'on';

  if (!email.includes('@')) return { error: 'Correo inválido.' };
  if (password.length < 6) return { error: 'La contraseña necesita al menos 6 caracteres.' };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: 'Ya existe una cuenta con este correo.' };

  await prisma.user.create({
    data: {
      name: name || email.split('@')[0],
      email,
      passwordHash: await bcrypt.hash(password, 10),
      isAdmin: admin,
      onboardingCompleted: true,
    },
  });

  revalidatePath('/admin');
  return { ok: `Miembro ${email} creado.` };
}

export async function resetPassword(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: 'Acceso restringido.' };

  const id = String(formData.get('id') || '');
  const password = String(formData.get('password') || '');
  if (password.length < 6) return { error: 'La contraseña necesita al menos 6 caracteres.' };

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  revalidatePath('/admin');
  return { ok: 'Contraseña actualizada.' };
}

export async function toggleAdmin(formData: FormData) {
  const me = await requireAdmin();
  if (!me) return;

  const id = String(formData.get('id') || '');
  // impede tirar o próprio acesso e ficar sem nenhum admin
  if (!id || id === me) return;

  const user = await prisma.user.findUnique({ where: { id }, select: { isAdmin: true } });
  if (!user) return;

  await prisma.user.update({ where: { id }, data: { isAdmin: !user.isAdmin } });
  revalidatePath('/admin');
}

export async function deleteMember(formData: FormData) {
  const me = await requireAdmin();
  if (!me) return;

  const id = String(formData.get('id') || '');
  if (!id || id === me) return; // não deixa apagar a si mesma

  await prisma.user.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin');
}

/* ------------------------------------------------------- foto da recompensa */

export async function setRewardImage(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await requireAdmin())) return { error: 'Acceso restringido.' };

  const id = String(formData.get('id') || '');
  const image = String(formData.get('image') || '').trim();
  if (!id) return { error: 'Recompensa inválida.' };

  await prisma.reward.update({ where: { id }, data: { image: image || null } });

  revalidatePath('/admin');
  revalidatePath('/recompensas');
  return { ok: 'Foto actualizada.' };
}
