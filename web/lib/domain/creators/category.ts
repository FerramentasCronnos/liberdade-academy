import { mapCategory, type InternalCategory } from '@/lib/domain/catalog/normalize';
import { prisma } from '@/lib/db';

/**
 * Categoria predominante do criador, derivada dos nomes dos produtos que ele
 * vendeu (a API não traz categoria por criador). "fisico" é o genérico do
 * mapeador, então só vale quando nenhuma categoria específica aparece.
 */
export function dominantCategory(productNames: string[]): InternalCategory | null {
  if (!productNames.length) return null;
  const votes = new Map<InternalCategory, number>();
  for (const name of productNames) {
    const category = mapCategory(name);
    votes.set(category, (votes.get(category) ?? 0) + 1);
  }
  const specific = [...votes.entries()].filter(([category]) => category !== 'fisico').sort((a, b) => b[1] - a[1]);
  return specific[0]?.[0] ?? 'fisico';
}

/** Recalcula a categoria de todos os criadores a partir dos produtos guardados (sem custo de API). */
export async function recomputeCreatorCategories() {
  const creators = await prisma.creator.findMany({
    select: { id: true, products: { select: { name: true }, orderBy: { revenue: 'desc' }, take: 20 } },
  });
  let updated = 0;
  for (const creator of creators) {
    const category = dominantCategory(creator.products.map((p) => p.name));
    await prisma.creator.update({ where: { id: creator.id }, data: { category } });
    updated += 1;
  }
  return { updated };
}
