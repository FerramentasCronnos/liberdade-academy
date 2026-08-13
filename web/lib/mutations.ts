import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { addPoints } from './domain/points';
import { encrypt, canEncrypt } from './domain/crypto';
import { AUTO_MISSIONS, tryCompleteAutoMission } from './domain/missions';
import {
  AffiliateError,
  buildAffiliateLink,
  detectMarketplace,
  type Marketplace,
} from './domain/affiliate-link';

/**
 * Operações de escrita.
 *
 * Erros de regra de negócio viram `DomainError`, que as Server Actions
 * traduzem em mensagem para a tela. Falha inesperada continua sendo exceção.
 */
export class DomainError extends Error {}

/* --------------------------------------------------------------------- auth */

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // compara mesmo sem usuário, para o tempo de resposta não revelar se o
  // e-mail existe
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) throw new DomainError('Correo o contraseña inválidos.');
  return user;
}

export async function registerUser(name: string, email: string, password: string) {
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) throw new DomainError('Ya existe una cuenta con este correo.');

  return prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

/* ------------------------------------------------------------------- perfil */

function normalizeHandle(value?: string | null) {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .trim();
  return cleaned ? cleaned.slice(0, 60) : null;
}

export async function updateProfile(
  userId: string,
  data: { name?: string; bio?: string | null; instagram?: string | null; tiktok?: string | null; avatar?: string | null },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name ? { name: data.name.slice(0, 80) } : {}),
      ...(data.bio !== undefined ? { bio: data.bio?.slice(0, 160) || null } : {}),
      ...(data.instagram !== undefined ? { instagram: normalizeHandle(data.instagram) } : {}),
      ...(data.tiktok !== undefined ? { tiktok: normalizeHandle(data.tiktok) } : {}),
      ...(data.avatar !== undefined ? { avatar: data.avatar || null } : {}),
    },
  });
}

/* --------------------------------------------------------------- comunidade */

export async function createPost(
  userId: string,
  content: string,
  category: string,
  image?: string,
) {
  const post = await prisma.post.create({
    data: { content, category, image, authorId: userId },
    include: { author: true, likes: true, comments: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { communityPosts: { increment: 1 }, xp: { increment: 20 } },
  });

  await tryCompleteAutoMission(userId, AUTO_MISSIONS.postCommunity);
  return post;
}

export async function togglePostLike(userId: string, postId: string) {
  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return false;
  }

  await prisma.postLike.create({ data: { postId, userId } });
  await tryCompleteAutoMission(userId, AUTO_MISSIONS.engageCommunity);
  return true;
}

/* ----------------------------------------------------------------- missões */

export async function submitMissionProof(
  userId: string,
  missionId: string,
  proofUrl: string,
  note?: string,
) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission?.active) throw new DomainError('Misión no encontrada.');
  if (mission.kind === 'automatic') {
    throw new DomainError('Esta misión se acredita automáticamente por el sistema.');
  }

  const existing = await prisma.missionCompletion.findFirst({
    where: { missionId, userId, status: { in: ['pending', 'approved'] } },
    orderBy: { createdAt: 'desc' },
  });

  if (existing?.status === 'pending') throw new DomainError('Ya tienes un envío en revisión.');
  if (existing?.status === 'approved' && !mission.repeatable) {
    throw new DomainError('Misión ya completada.');
  }

  return prisma.missionCompletion.create({
    data: { missionId, userId, status: 'pending', proofUrl, note },
  });
}

export async function reviewMission(completionId: string, status: 'approved' | 'rejected') {
  const completion = await prisma.missionCompletion.findUnique({
    where: { id: completionId },
    include: { mission: true },
  });
  if (!completion) throw new DomainError('Envío no encontrado.');
  if (completion.status !== 'pending') throw new DomainError('Este envío ya fue revisado.');

  await prisma.$transaction(async (tx) => {
    await tx.missionCompletion.update({
      where: { id: completionId },
      data: {
        status,
        reviewedAt: new Date(),
        pointsAwarded: status === 'approved' ? completion.mission.points : 0,
      },
    });

    if (status === 'approved') {
      await addPoints(
        completion.userId,
        completion.mission.points,
        `Misión: ${completion.mission.title}`,
        { type: 'mission', id: completion.missionId },
        tx,
      );
    }
  });
}

/* ------------------------------------------------------------- recompensas */

export async function redeemReward(userId: string, rewardId: string) {
  // débito, baixa de estoque e pedido na mesma transação: senão dois cliques
  // simultâneos gastariam o mesmo saldo
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });
    if (!reward?.active) throw new DomainError('Recompensa no encontrada.');
    if (reward.stock != null && reward.stock <= 0) throw new DomainError('Recompensa agotada.');

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.points < reward.costPoints) throw new DomainError('Puntos insuficientes.');

    if (reward.stock != null) {
      await tx.reward.update({ where: { id: rewardId }, data: { stock: { decrement: 1 } } });
    }

    const created = await tx.redemption.create({
      data: { rewardId, userId, costPoints: reward.costPoints, status: 'requested' },
    });

    await addPoints(
      userId,
      -reward.costPoints,
      `Canje: ${reward.title}`,
      { type: 'redemption', id: created.id },
      tx,
    );

    return created;
  });
}

/* ---------------------------------------------------------------- afiliado */

export async function saveAffiliateAccount(
  userId: string,
  marketplace: string,
  publicId: string | null,
  secret?: string | null,
) {
  if (secret && !canEncrypt()) {
    throw new DomainError(
      'CREDENTIALS_KEY no está configurada en el servidor. Sin ella no guardo secretos en texto plano.',
    );
  }

  const data = {
    publicId: publicId?.trim() || null,
    ...(secret !== undefined ? { secret: secret ? encrypt(secret) : null } : {}),
  };

  return prisma.affiliateAccount.upsert({
    where: { userId_marketplace: { userId, marketplace } },
    update: data,
    create: { userId, marketplace, ...data },
  });
}

export async function createAffiliateLink(userId: string, url: string, marketplace?: string) {
  const resolved = (marketplace as Marketplace) ?? detectMarketplace(url);
  if (!resolved) {
    throw new DomainError('No reconocí el marketplace de esta URL. Usa Amazon, Shopee o Mercado Libre.');
  }

  const account = await prisma.affiliateAccount.findUnique({
    where: { userId_marketplace: { userId, marketplace: resolved } },
  });

  try {
    const result = buildAffiliateLink(url, resolved, account);
    return prisma.affiliateLink.create({
      data: {
        userId,
        marketplace: resolved,
        originalUrl: url,
        affiliateUrl: result.affiliateUrl,
      },
    });
  } catch (error) {
    if (error instanceof AffiliateError) throw new DomainError(error.message);
    throw error;
  }
}

export async function deleteAffiliateLink(userId: string, id: string) {
  await prisma.affiliateLink.deleteMany({ where: { id, userId } });
}

/* --------------------------------------------------------------- templates */

export async function saveTemplate(
  userId: string,
  data: { id?: string; name: string; marketplace: string; body: string },
) {
  if (data.id) {
    const updated = await prisma.offerTemplate.updateMany({
      where: { id: data.id, userId },
      data: { name: data.name, marketplace: data.marketplace, body: data.body },
    });
    if (updated.count === 0) throw new DomainError('Plantilla no encontrada.');
    return;
  }

  await prisma.offerTemplate.create({
    data: { userId, name: data.name, marketplace: data.marketplace, body: data.body },
  });
}

export async function deleteTemplate(userId: string, id: string) {
  await prisma.offerTemplate.deleteMany({ where: { id, userId } });
}

/* ----------------------------------------------------------------- páginas */

const RESERVED = new Set(['login', 'catalogo', 'comunidade', 'perfil', 'api', 'admin', 'p', 'bio']);

function randomSlug() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export async function createLandingPage(
  userId: string,
  data: { kind: string; template: string; title: string; subtitle?: string; config?: unknown },
) {
  let slug = randomSlug();
  for (let i = 0; i < 5; i += 1) {
    const taken = await prisma.landingPage.findUnique({ where: { slug } });
    if (!taken) break;
    slug = randomSlug();
  }

  return prisma.landingPage.create({
    data: {
      userId,
      kind: data.kind,
      slug,
      template: data.template,
      title: data.title,
      subtitle: data.subtitle,
      config: (data.config ?? {}) as object,
    },
  });
}

export async function updateLandingPage(userId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.landingPage.findFirst({ where: { id, userId } });
  if (!existing) throw new DomainError('Página no encontrada.');

  if (typeof data.slug === 'string') {
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 48);
    if (slug.length < 3 || RESERVED.has(slug)) {
      throw new DomainError('Elige otra dirección para la página.');
    }
    if (slug !== existing.slug) {
      const taken = await prisma.landingPage.findUnique({ where: { slug } });
      if (taken) throw new DomainError('Esta dirección ya está en uso.');
    }
    data.slug = slug;
  }

  return prisma.landingPage.update({ where: { id }, data: data as never });
}

export async function deleteLandingPage(userId: string, id: string) {
  await prisma.landingPage.deleteMany({ where: { id, userId } });
}

export async function addPageGroup(
  userId: string,
  pageId: string,
  data: { name: string; inviteUrl: string; clickLimit: number | null },
) {
  const page = await prisma.landingPage.findFirst({ where: { id: pageId, userId } });
  if (!page) throw new DomainError('Página no encontrada.');

  const count = await prisma.pageGroup.count({ where: { pageId } });
  return prisma.pageGroup.create({ data: { pageId, ...data, order: count } });
}

export async function removePageGroup(userId: string, pageId: string, groupId: string) {
  const page = await prisma.landingPage.findFirst({ where: { id: pageId, userId } });
  if (!page) throw new DomainError('Página no encontrada.');
  await prisma.pageGroup.deleteMany({ where: { id: groupId, pageId } });
}

export async function saveRotation(
  userId: string,
  pageId: string,
  data: { rotationAuto?: boolean; defaultClickLimit: number | null },
) {
  await prisma.landingPage.updateMany({ where: { id: pageId, userId }, data });
}

/**
 * Clique no botão da presell: escolhe o grupo, conta e registra a origem.
 * Escolha e incremento na mesma transação — senão dois cliques simultâneos
 * leriam o contador antes de qualquer um gravar e o grupo passaria do limite.
 */
export async function registerPageClick(
  slug: string,
  utm: Record<string, string | undefined>,
  userAgent: string,
) {
  const page = await prisma.landingPage.findUnique({ where: { slug } });
  if (!page || !page.published) throw new DomainError('Página no encontrada.');

  const device = /mobile|android|iphone/i.test(userAgent)
    ? 'mobile'
    : /tablet|ipad/i.test(userAgent)
      ? 'tablet'
      : 'desktop';

  return prisma.$transaction(async (tx) => {
    const groups = await tx.pageGroup.findMany({
      where: { pageId: page.id, active: true },
      orderBy: { order: 'asc' },
    });
    if (groups.length === 0) throw new DomainError('Ningún grupo configurado en esta página.');

    const limitFor = (g: (typeof groups)[number]) => g.clickLimit ?? page.defaultClickLimit;

    let chosen = page.rotationAuto
      ? groups.find((g) => {
          const limit = limitFor(g);
          return limit == null || g.clicks < limit;
        })
      : [...groups].sort((a, b) => a.clicks - b.clicks)[0];

    // todos no limite: volta pro primeiro em vez de deixar o botão morto
    if (!chosen) chosen = groups[0];

    await tx.pageGroup.update({ where: { id: chosen.id }, data: { clicks: { increment: 1 } } });

    await tx.pageClick.create({
      data: {
        pageId: page.id,
        groupId: chosen.id,
        utmSource: utm.utm_source?.slice(0, 120),
        utmMedium: utm.utm_medium?.slice(0, 120),
        utmCampaign: utm.utm_campaign?.slice(0, 120),
        utmContent: utm.utm_content?.slice(0, 120),
        utmTerm: utm.utm_term?.slice(0, 120),
        referrer: utm.referrer?.slice(0, 300),
        device,
      },
    });

    return { url: chosen.inviteUrl, group: chosen.name };
  });
}

/* ---------------------------------------------------------- baú de anúncios */

export async function createAd(
  userId: string,
  data: { title: string; category: string; image: string; notes?: string | null },
) {
  return prisma.adCreative.create({ data: { ...data, createdById: userId } });
}

export async function deleteAd(id: string) {
  await prisma.adCreative.deleteMany({ where: { id } });
}

export async function countAdDownload(id: string) {
  await prisma.adCreative
    .update({ where: { id }, data: { downloads: { increment: 1 } } })
    .catch(() => undefined);
}
