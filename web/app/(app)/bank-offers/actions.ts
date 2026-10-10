'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/session';

/** Marca/desmarca um criador como favorito do membro logado. Devolve o estado novo. */
export async function toggleCreatorFavorite(creatorId: string): Promise<{ favorite: boolean } | { error: string }> {
  const userId = await getUserId();
  if (!userId) return { error: 'Inicia sesión para guardar favoritos.' };
  if (!creatorId) return { error: 'Creador inválido.' };

  const existing = await prisma.creatorFavorite.findUnique({ where: { userId_creatorId: { userId, creatorId } } });
  if (existing) {
    await prisma.creatorFavorite.delete({ where: { id: existing.id } });
  } else {
    const creator = await prisma.creator.findUnique({ where: { id: creatorId }, select: { id: true } });
    if (!creator) return { error: 'Creador no encontrado.' };
    await prisma.creatorFavorite.create({ data: { userId, creatorId } });
  }
  revalidatePath('/bank-offers');
  revalidatePath(`/bank-offers/${creatorId}`);
  return { favorite: !existing };
}
