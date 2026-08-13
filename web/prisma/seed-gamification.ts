import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Missões e recompensas iniciais.
 *
 * Roda por upsert no slug: pode executar de novo sem duplicar, e editar o
 * texto aqui atualiza o registro existente.
 *
 * "automatic" só existe para eventos que o sistema realmente observa hoje
 * (publicar e curtir). O resto é "proof" — o membro envia print e passa por
 * revisão, porque não temos como verificar sozinhos.
 */

const MISSIONS = [
  {
    slug: 'engajar-comunidade',
    title: 'Interactuar en la Comunidad',
    description: 'Dale me gusta a una publicación de la comunidad y gana 5 puntos (1 vez al día).',
    points: 5,
    category: 'outras',
    kind: 'automatic',
    repeatable: true,
    cooldownHours: 24,
    order: 1,
  },
  {
    slug: 'postar-comunidade',
    title: 'Publicar en la Comunidad',
    description: 'Publica en la comunidad y gana 5 puntos (1 vez al día).',
    points: 5,
    category: 'outras',
    kind: 'automatic',
    repeatable: true,
    cooldownHours: 24,
    order: 2,
  },
  {
    slug: 'completar-perfil',
    title: 'Completar el perfil',
    description: 'Agrega foto y bio a tu perfil de la comunidad y gana 20 puntos.',
    points: 20,
    category: 'outras',
    kind: 'proof',
    repeatable: false,
    order: 3,
  },
  {
    slug: 'primeira-venda',
    title: 'Primera venta realizada',
    description: 'Haz tu primera venta y gana 100 puntos (envía la captura de la comisión).',
    points: 100,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 4,
  },
  {
    slug: 'primeiros-50',
    title: 'Primeros US$ 50 en comisiones',
    description: 'Acumula tus primeros US$ 50 en comisiones y gana 100 puntos.',
    points: 100,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 5,
  },
  {
    slug: 'primeiros-500',
    title: 'Primeros US$ 500 en comisiones',
    description: 'Acumula US$ 500 en comisiones y gana 150 puntos.',
    points: 150,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 6,
  },
  {
    slug: 'primeiros-1000',
    title: 'Primeros US$ 1.000 en comisiones',
    description: 'Acumula US$ 1.000 en comisiones y gana 300 puntos.',
    points: 300,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 7,
  },
  {
    slug: 'primeiros-5000',
    title: 'Primeros US$ 5.000 en comisiones',
    description: 'Acumula US$ 5.000 en comisiones y gana 500 puntos.',
    points: 500,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 8,
  },
  {
    slug: 'finalizar-curso',
    title: 'Terminar el curso',
    description: 'Mira todas las clases hasta el final y gana 150 puntos.',
    points: 150,
    category: 'curso',
    kind: 'proof',
    repeatable: false,
    order: 9,
  },
  {
    slug: 'indicou-e-comprou',
    title: 'Recomendó y compró',
    description: 'Recomienda a una amiga que compre y gana 500 puntos.',
    points: 500,
    category: 'indicacoes',
    kind: 'proof',
    repeatable: true,
    order: 10,
  },
  {
    slug: 'recomende',
    title: 'Recomienda Liberdade Academy',
    description:
      'Publica un video en una red social abierta contando tu experiencia y gana 500 puntos.',
    points: 500,
    category: 'outras',
    kind: 'proof',
    repeatable: true,
    order: 11,
  },
];

const REWARDS = [
  { slug: 'copo-termico', title: 'Vaso térmico personalizado', costPoints: 2500, order: 1 },
  { slug: 'moletom', title: 'Buzo oficial', costPoints: 4000, order: 2 },
  { slug: 'mochila', title: 'Mochila ejecutiva', costPoints: 4000, order: 3 },
  {
    slug: 'kit-gravacao',
    title: 'Kit de grabación de contenido',
    description: 'Trípode y softbox para grabar tus videos.',
    costPoints: 5000,
    order: 4,
  },
  { slug: 'kit-livros', title: 'Kit de libros seleccionados', costPoints: 6000, order: 5 },
  { slug: 'kindle', title: 'Kindle', costPoints: 7000, order: 6 },
  { slug: 'capcut-pro', title: '1 año de CapCut Pro', costPoints: 7000, order: 7 },
  { slug: 'microfone', title: 'Micrófono de solapa inalámbrico', costPoints: 8000, order: 8 },
  { slug: 'box-surpresa', title: 'Caja sorpresa', costPoints: 8000, order: 9 },
  { slug: 'kit-escritorio', title: 'Kit de oficina personalizado', costPoints: 8000, order: 10 },
  { slug: 'cadeira', title: 'Silla ergonómica', costPoints: 12000, order: 11 },
  { slug: 'chatgpt-plus', title: '1 año de ChatGPT Plus', costPoints: 15000, order: 12 },
  { slug: 'airpods', title: 'AirPods Pro', costPoints: 20000, order: 13 },
  { slug: 'iphone', title: 'iPhone', costPoints: 90000, order: 14 },
  { slug: 'ipad', title: 'iPad Air', costPoints: 100000, order: 15 },
  { slug: 'macbook', title: 'MacBook Air', costPoints: 145000, order: 16 },
  {
    slug: 'consultoria',
    title: '1 hora de consultoría individual',
    costPoints: 150000,
    order: 17,
  },
];

async function main() {
  for (const mission of MISSIONS) {
    await prisma.mission.upsert({
      where: { slug: mission.slug },
      update: mission,
      create: mission,
    });
  }

  for (const reward of REWARDS) {
    await prisma.reward.upsert({
      where: { slug: reward.slug },
      update: reward,
      create: reward,
    });
  }

  // Define a administradora, que revisa as comprovações de missão.
  //
  // Só promove se AINDA NÃO existir nenhum admin. A versão anterior pegava o
  // "primeiro usuário por createdAt" a cada execução — como o seed cria todos
  // no mesmo instante, o desempate era arbitrário e cada restart promovia
  // alguém diferente, espalhando admin sem ninguém perceber.
  const existingAdmin = await prisma.user.findFirst({ where: { isAdmin: true } });

  if (!existingAdmin) {
    const wanted = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    const admin = wanted
      ? await prisma.user.findUnique({ where: { email: wanted } })
      : await prisma.user.findFirst({ orderBy: [{ createdAt: 'asc' }, { email: 'asc' }] });

    if (admin) {
      await prisma.user.update({ where: { id: admin.id }, data: { isAdmin: true } });
      console.log(`Admin definida: ${admin.email}`);
    }
  } else {
    console.log(`Admin já definida: ${existingAdmin.email}`);
  }

  console.log(`Gamificação: ${MISSIONS.length} missões, ${REWARDS.length} recompensas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
