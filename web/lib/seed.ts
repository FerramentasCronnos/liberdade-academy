import bcrypt from 'bcryptjs';
import { prisma } from './db';
import products from '../prisma/seed-products.json';

/**
 * Carga inicial do banco.
 *
 * Idempotente de ponta a ponta: missões e recompensas usam upsert por slug,
 * produtos usam a chave (provider, region, externalId) e os usuários de
 * exemplo só entram quando o banco está vazio. Rodar de novo não duplica nada.
 */

const MISSIONS = [
  { slug: 'engajar-comunidade', title: 'Interactuar en la Comunidad', description: 'Dale me gusta a una publicación de la comunidad y gana 5 puntos (1 vez al día).', points: 5, category: 'outras', kind: 'automatic', repeatable: true, cooldownHours: 24, order: 1 },
  { slug: 'postar-comunidade', title: 'Publicar en la Comunidad', description: 'Publica en la comunidad y gana 5 puntos (1 vez al día).', points: 5, category: 'outras', kind: 'automatic', repeatable: true, cooldownHours: 24, order: 2 },
  { slug: 'completar-perfil', title: 'Completar el perfil', description: 'Agrega foto y bio a tu perfil de la comunidad y gana 20 puntos.', points: 20, category: 'outras', kind: 'proof', repeatable: false, order: 3 },
  { slug: 'primeira-venda', title: 'Primera venta realizada', description: 'Haz tu primera venta y gana 100 puntos (envía la captura de la comisión).', points: 100, category: 'vendas', kind: 'proof', repeatable: false, order: 4 },
  { slug: 'primeiros-50', title: 'Primeros US$ 50 en comisiones', description: 'Acumula tus primeros US$ 50 en comisiones y gana 100 puntos.', points: 100, category: 'vendas', kind: 'proof', repeatable: false, order: 5 },
  { slug: 'primeiros-500', title: 'Primeros US$ 500 en comisiones', description: 'Acumula US$ 500 en comisiones y gana 150 puntos.', points: 150, category: 'vendas', kind: 'proof', repeatable: false, order: 6 },
  { slug: 'primeiros-1000', title: 'Primeros US$ 1.000 en comisiones', description: 'Acumula US$ 1.000 en comisiones y gana 300 puntos.', points: 300, category: 'vendas', kind: 'proof', repeatable: false, order: 7 },
  { slug: 'primeiros-5000', title: 'Primeros US$ 5.000 en comisiones', description: 'Acumula US$ 5.000 en comisiones y gana 500 puntos.', points: 500, category: 'vendas', kind: 'proof', repeatable: false, order: 8 },
  { slug: 'finalizar-curso', title: 'Terminar el curso', description: 'Mira todas las clases hasta el final y gana 150 puntos.', points: 150, category: 'curso', kind: 'proof', repeatable: false, order: 9 },
  { slug: 'indicou-e-comprou', title: 'Recomendó y compró', description: 'Recomienda a una amiga que compre y gana 500 puntos.', points: 500, category: 'indicacoes', kind: 'proof', repeatable: true, order: 10 },
  { slug: 'recomende', title: 'Recomienda Liberdade Academy', description: 'Publica un video en una red social abierta contando tu experiencia y gana 500 puntos.', points: 500, category: 'outras', kind: 'proof', repeatable: true, order: 11 },
];

const REWARDS = [
  { slug: 'copo-termico', title: 'Vaso térmico personalizado', costPoints: 2500, order: 1 },
  { slug: 'moletom', title: 'Buzo oficial', costPoints: 4000, order: 2 },
  { slug: 'mochila', title: 'Mochila ejecutiva', costPoints: 4000, order: 3 },
  { slug: 'kit-gravacao', title: 'Kit de grabación de contenido', description: 'Trípode y softbox para grabar tus videos.', costPoints: 5000, order: 4 },
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
  { slug: 'consultoria', title: '1 hora de consultoría individual', costPoints: 150000, order: 17 },
];

export async function runSeed() {
  const report: Record<string, number | string> = {};

  for (const mission of MISSIONS) {
    await prisma.mission.upsert({ where: { slug: mission.slug }, update: mission, create: mission });
  }
  report.missions = MISSIONS.length;

  for (const reward of REWARDS) {
    await prisma.reward.upsert({ where: { slug: reward.slug }, update: reward, create: reward });
  }
  report.rewards = REWARDS.length;

  // catálogo inicial — evita depender da Apify no primeiro acesso
  let saved = 0;
  for (const item of products as Array<Record<string, unknown>>) {
    const { externalId, provider, region, ...rest } = item as {
      externalId: string;
      provider: string;
      region: string;
    } & Record<string, unknown>;

    await prisma.product.upsert({
      where: { provider_region_externalId: { provider, region, externalId } },
      update: { ...rest, active: true } as never,
      create: { ...rest, externalId, provider, region } as never,
    });
    saved += 1;
  }
  report.products = saved;

  // usuário administrador só quando o banco ainda não tem ninguém
  const existing = await prisma.user.count();
  if (existing === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@liberdade.academy';
    const password = process.env.ADMIN_PASSWORD?.trim();

    if (!password) {
      report.admin = 'pulado: defina ADMIN_PASSWORD para criar a conta inicial';
    } else {
      await prisma.user.create({
        data: {
          name: 'Admin',
          email,
          passwordHash: await bcrypt.hash(password, 10),
          isAdmin: true,
          onboardingCompleted: true,
        },
      });
      report.admin = email;
    }
  } else {
    report.admin = `já existem ${existing} usuários`;
  }

  return report;
}
