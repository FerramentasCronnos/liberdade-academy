import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sem produtos no seed de propósito.
//
// Os produtos fictícios usavam imagens aleatórias do picsum.photos, que
// apareciam no app como se fossem foto do produto. O catálogo agora vem
// exclusivamente do sync com o provider real (POST /products/sync).
// Enquanto nenhum sync rodar, a aba Catálogo mostra o estado vazio.


async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Seed pulado — banco já possui dados.');
    return;
  }

  const passwordHash = await bcrypt.hash('123456', 10);

  const users = await Promise.all(
    [
      { name: 'Pedro Oliveira', email: 'pedro@liberdade.academy', level: 30, xp: 15200, rank: 1, salesMade: 342 },
      { name: 'Lucas Mendes', email: 'lucas@liberdade.academy', level: 22, xp: 9800, rank: 2, salesMade: 256 },
      { name: 'Juliana Costa', email: 'juliana@liberdade.academy', level: 18, xp: 7500, rank: 3, salesMade: 198 },
      { name: 'Ana Clara', email: 'ana@liberdade.academy', level: 15, xp: 5400, rank: 4, salesMade: 145 },
      { name: 'Thais Maximiana', email: 'thais@liberdade.academy', level: 12, xp: 2450, rank: 6, salesMade: 87 },
    ].map((u) =>
      prisma.user.create({
        data: {
          ...u,
          passwordHash,
          onboardingCompleted: true,
          niche: 'beleza',
          alreadySelling: true,
          revenueRange: '5k_15k',
          goal: 'escalar',
          onboardingAt: new Date(),
          communityPosts: 3,
        },
      }),
    ),
  );

  const ana = users.find((u) => u.email.startsWith('ana'))!;
  const lucas = users.find((u) => u.email.startsWith('lucas'))!;
  const pedro = users.find((u) => u.email.startsWith('pedro'))!;

  await prisma.post.createMany({
    data: [
      {
        authorId: ana.id,
        category: 'resultado',
        content:
          '¡Chicas, hice mi primera venta de US$500 hoy usando el catálogo! El sérum de vitamina C está explotando en TikTok.',
      },
      {
        authorId: lucas.id,
        category: 'dica',
        content:
          'Dica de ouro: foquem em produtos com mais de 1M de views no TikTok. A taxa de conversão é 3x maior!',
      },
      {
        authorId: pedro.id,
        category: 'resultado',
        content:
          '¡Superamos la meta del mes! US$15.000 en ventas solo con dropshipping. Sin stock, sin logística.',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        title: 'Catálogo actualizado',
        body: 'Nuevos productos virales de TikTok Shop entraron al catálogo.',
        route: '/(tabs)/catalog',
      },
      {
        title: 'Ranking actualizado',
        body: 'Mira tu posición en la clasificación de la semana.',
        route: '/(tabs)/ranking',
      },
      {
        title: 'Nueva publicación',
        body: 'Ana Clara compartió un resultado en la comunidad.',
        route: '/(tabs)/community',
      },
    ],
  });

  console.log('Seed OK');
  console.log('Login demo: thais@liberdade.academy / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
