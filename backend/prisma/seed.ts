import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    name: 'Sérum Vitamina C Premium',
    image: 'https://picsum.photos/seed/prod1/300/300',
    price: 89.9,
    category: 'beleza',
    supplier: 'Beauty Supply Co',
    rating: 4.8,
    salesCount: 12500,
    tiktokViews: 2300000,
    isViral: true,
    commission: 35,
    description: 'Sérum facial com vitamina C pura, ácido hialurônico e niacinamida.',
    supplierShips: true,
  },
  {
    name: 'Whey Protein Isolado 900g',
    image: 'https://picsum.photos/seed/prod2/300/300',
    price: 149.9,
    category: 'saude',
    supplier: 'NutriMax Brasil',
    rating: 4.9,
    salesCount: 8700,
    tiktokViews: 1500000,
    isViral: true,
    commission: 25,
    description: 'Whey protein isolado com 30g de proteína por dose.',
    supplierShips: true,
  },
  {
    name: 'Ring Light Profissional 18"',
    image: 'https://picsum.photos/seed/prod3/300/300',
    price: 199.9,
    category: 'tech',
    supplier: 'TechStore Direct',
    rating: 4.7,
    salesCount: 6200,
    tiktokViews: 890000,
    isViral: true,
    commission: 30,
    description: 'Ring light profissional com tripé ajustável e suporte para celular.',
    supplierShips: true,
  },
  {
    name: 'Cinta Modeladora Térmica',
    image: 'https://picsum.photos/seed/prod4/300/300',
    price: 79.9,
    category: 'fitness',
    supplier: 'FitWear Brasil',
    rating: 4.6,
    salesCount: 15800,
    tiktokViews: 4200000,
    isViral: true,
    commission: 40,
    description: 'Cinta modeladora com efeito térmico para treinos.',
    supplierShips: true,
  },
  {
    name: 'Kit Skincare Coreano',
    image: 'https://picsum.photos/seed/prod5/300/300',
    price: 129.9,
    category: 'beleza',
    supplier: 'K-Beauty Import',
    rating: 4.9,
    salesCount: 9300,
    tiktokViews: 3100000,
    isViral: true,
    commission: 38,
    description: 'Kit completo de skincare com 7 etapas da rotina coreana.',
    supplierShips: true,
  },
  {
    name: 'Curso Dropshipping Avançado',
    image: 'https://picsum.photos/seed/prod6/300/300',
    price: 297,
    category: 'digital',
    supplier: 'Liberdade Academy',
    rating: 4.8,
    salesCount: 3200,
    isViral: false,
    commission: 50,
    description: 'Curso completo de dropshipping com estratégias avançadas.',
    supplierShips: false,
  },
  {
    name: 'Colágeno Hidrolisado Verisol',
    image: 'https://picsum.photos/seed/prod7/300/300',
    price: 69.9,
    category: 'saude',
    supplier: 'VitaLab',
    rating: 4.7,
    salesCount: 11200,
    tiktokViews: 1800000,
    isViral: true,
    commission: 32,
    description: 'Colágeno hidrolisado tipo I com tecnologia Verisol.',
    supplierShips: true,
  },
  {
    name: 'Luminária LED Smart WiFi',
    image: 'https://picsum.photos/seed/prod8/300/300',
    price: 159.9,
    category: 'casa',
    supplier: 'SmartHome BR',
    rating: 4.5,
    salesCount: 4500,
    tiktokViews: 720000,
    isViral: true,
    commission: 28,
    description: 'Luminária inteligente com controle por app e Alexa.',
    supplierShips: true,
  },
  {
    name: 'Tênis Esportivo Ultra Boost',
    image: 'https://picsum.photos/seed/prod9/300/300',
    price: 249.9,
    category: 'moda',
    supplier: 'SneakerDrop',
    rating: 4.8,
    salesCount: 7800,
    tiktokViews: 2600000,
    isViral: true,
    commission: 22,
    description: 'Tênis esportivo com amortecimento ultra boost.',
    supplierShips: true,
  },
  {
    name: 'Kit Maquiagem Completo',
    image: 'https://picsum.photos/seed/prod10/300/300',
    price: 189.9,
    category: 'beleza',
    supplier: 'MakeUp Pro',
    rating: 4.6,
    salesCount: 5600,
    tiktokViews: 1400000,
    isViral: true,
    commission: 35,
    description: 'Kit profissional com paleta, pincéis e fixador.',
    supplierShips: true,
  },
];

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

  const products = await Promise.all(PRODUCTS.map((p) => prisma.product.create({ data: p })));

  const ana = users.find((u) => u.email.startsWith('ana'))!;
  const lucas = users.find((u) => u.email.startsWith('lucas'))!;
  const pedro = users.find((u) => u.email.startsWith('pedro'))!;

  await prisma.post.createMany({
    data: [
      {
        authorId: ana.id,
        category: 'resultado',
        content:
          'Galera, fiz minha primeira venda de R$500 hoje usando o catálogo! O sérum de vitamina C tá bombando no TikTok.',
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
          'Batemos a meta do mês! R$15.000 em vendas só com dropshipping. Sem estoque, sem logística.',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        title: 'Produto viral do dia',
        body: 'Sérum Vitamina C Premium está em alta no TikTok.',
        route: `/product/${products[0].id}`,
      },
      {
        title: 'Ranking atualizado',
        body: 'Confira sua posição na classificação da semana.',
        route: '/(tabs)/ranking',
      },
      {
        title: 'Nova postagem',
        body: 'Ana Clara compartilhou um resultado na comunidade.',
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
