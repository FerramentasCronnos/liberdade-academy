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
    title: 'Engajar na Comunidade',
    description: 'Curta uma publicação da comunidade e ganhe 5 pontos (1x por dia).',
    points: 5,
    category: 'outras',
    kind: 'automatic',
    repeatable: true,
    cooldownHours: 24,
    order: 1,
  },
  {
    slug: 'postar-comunidade',
    title: 'Postar na Comunidade',
    description: 'Publique um post na comunidade e ganhe 5 pontos (1x por dia).',
    points: 5,
    category: 'outras',
    kind: 'automatic',
    repeatable: true,
    cooldownHours: 24,
    order: 2,
  },
  {
    slug: 'completar-perfil',
    title: 'Completar o perfil',
    description: 'Adicione foto e bio ao seu perfil da comunidade e ganhe 20 pontos.',
    points: 20,
    category: 'outras',
    kind: 'proof',
    repeatable: false,
    order: 3,
  },
  {
    slug: 'primeira-venda',
    title: 'Primeira venda realizada',
    description: 'Faça sua primeira venda e ganhe 100 pontos (envie o print da comissão).',
    points: 100,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 4,
  },
  {
    slug: 'primeiros-50',
    title: 'Primeiros R$ 50 em comissões',
    description: 'Acumule seus primeiros R$ 50 em comissões e ganhe 100 pontos.',
    points: 100,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 5,
  },
  {
    slug: 'primeiros-500',
    title: 'Primeiros R$ 500 em comissões',
    description: 'Acumule R$ 500 em comissões e ganhe 150 pontos.',
    points: 150,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 6,
  },
  {
    slug: 'primeiros-1000',
    title: 'Primeiros R$ 1.000 em comissões',
    description: 'Acumule R$ 1.000 em comissões e ganhe 300 pontos.',
    points: 300,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 7,
  },
  {
    slug: 'primeiros-5000',
    title: 'Primeiros R$ 5.000 em comissões',
    description: 'Acumule R$ 5.000 em comissões e ganhe 500 pontos.',
    points: 500,
    category: 'vendas',
    kind: 'proof',
    repeatable: false,
    order: 8,
  },
  {
    slug: 'finalizar-curso',
    title: 'Finalizar o curso',
    description: 'Assista todas as aulas até o final e ganhe 150 pontos.',
    points: 150,
    category: 'curso',
    kind: 'proof',
    repeatable: false,
    order: 9,
  },
  {
    slug: 'indicou-e-comprou',
    title: 'Indicou e comprou',
    description: 'Indique uma amiga que comprou e ganhe 500 pontos.',
    points: 500,
    category: 'indicacoes',
    kind: 'proof',
    repeatable: true,
    order: 10,
  },
  {
    slug: 'recomende',
    title: 'Recomende a Liberdade Academy',
    description:
      'Poste um vídeo em rede social aberta contando sua experiência e ganhe 500 pontos.',
    points: 500,
    category: 'outras',
    kind: 'proof',
    repeatable: true,
    order: 11,
  },
];

const REWARDS = [
  { slug: 'copo-termico', title: 'Copo térmico personalizado', costPoints: 2500, order: 1 },
  { slug: 'moletom', title: 'Moletom oficial', costPoints: 4000, order: 2 },
  { slug: 'mochila', title: 'Mochila executiva', costPoints: 4000, order: 3 },
  {
    slug: 'kit-gravacao',
    title: 'Kit de gravação de conteúdo',
    description: 'Tripé e softbox para gravar seus vídeos.',
    costPoints: 5000,
    order: 4,
  },
  { slug: 'kit-livros', title: 'Kit de livros selecionados', costPoints: 6000, order: 5 },
  { slug: 'kindle', title: 'Kindle', costPoints: 7000, order: 6 },
  { slug: 'capcut-pro', title: '1 ano de CapCut Pro', costPoints: 7000, order: 7 },
  { slug: 'microfone', title: 'Microfone de lapela sem fio', costPoints: 8000, order: 8 },
  { slug: 'box-surpresa', title: 'Box surpresa', costPoints: 8000, order: 9 },
  { slug: 'kit-escritorio', title: 'Kit escritório personalizado', costPoints: 8000, order: 10 },
  { slug: 'cadeira', title: 'Cadeira ergonômica', costPoints: 12000, order: 11 },
  { slug: 'chatgpt-plus', title: '1 ano de ChatGPT Plus', costPoints: 15000, order: 12 },
  { slug: 'airpods', title: 'AirPods Pro', costPoints: 20000, order: 13 },
  { slug: 'iphone', title: 'iPhone', costPoints: 90000, order: 14 },
  { slug: 'ipad', title: 'iPad Air', costPoints: 100000, order: 15 },
  { slug: 'macbook', title: 'MacBook Air', costPoints: 145000, order: 16 },
  {
    slug: 'consultoria',
    title: '1 hora de consultoria individual',
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
