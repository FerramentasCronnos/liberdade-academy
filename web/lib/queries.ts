import { prisma } from './db';
import { serializePost, serializeProduct, serializeUser } from './domain/serialize';
import { nextAvailableAt } from './domain/missions';

/**
 * Consultas de leitura das telas.
 *
 * Server Components chamam estas funções direto; não existe mais uma API HTTP
 * intermediária. Cada uma devolve o mesmo formato que as telas já esperavam,
 * então os componentes não precisaram mudar.
 */

/* ------------------------------------------------------------------ catálogo */

export async function listProducts(params: {
  region?: string;
  category?: string;
  q?: string;
  viral?: boolean;
  limit?: number;
}) {
  const take = Math.min(Math.max(1, params.limit ?? 200), 200);

  const products = await prisma.product.findMany({
    where: {
      active: true,
      // produto sem foto não vai pra vitrine — card vazio parece bug
      image: { startsWith: 'http' },
      ...(params.region ? { region: params.region } : {}),
      ...(params.category && params.category !== 'todos' ? { category: params.category } : {}),
      ...(params.viral ? { isViral: true } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' as const } },
              { description: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ isViral: 'desc' }, { salesCount: 'desc' }],
    take,
  });

  return products.map(serializeProduct);
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  return product ? serializeProduct(product) : null;
}

/* --------------------------------------------------------------- comunidade */

export async function listPosts(currentUserId: string, category?: string) {
  const posts = await prisma.post.findMany({
    where: category && category !== 'todos' ? { category } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { author: true, likes: true, comments: true },
  });

  return posts.map((post) => serializePost(post, currentUserId));
}

export async function getMemberProfile(id: string, currentUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: true, likes: true, comments: true },
      },
    },
  });
  if (!user) return null;

  const likesReceived = await prisma.postLike.count({ where: { post: { authorId: id } } });

  return {
    user: serializeUser(user),
    stats: { posts: user.posts.length, likesReceived },
    posts: user.posts.map((post) => serializePost(post, currentUserId)),
  };
}

/* ------------------------------------------------------------------ ranking */

export async function listRanking() {
  const users = await prisma.user.findMany({
    orderBy: [{ xp: 'desc' }, { salesMade: 'desc' }],
    take: 50,
  });

  return users.map((user, index) => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? undefined,
    level: user.level,
    xp: user.xp,
    rank: index + 1,
    salesCount: user.salesMade,
  }));
}

/* ----------------------------------------------------------------- missões */

export async function listMissions(userId: string) {
  const missions = await prisma.mission.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { points: 'asc' }],
    include: {
      completions: { where: { userId }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return missions.map((mission) => {
    const last = mission.completions[0] ?? null;
    const approved = last?.status === 'approved';
    const availableAt = approved ? nextAvailableAt(last.createdAt, mission.cooldownHours) : null;

    return {
      id: mission.id,
      slug: mission.slug,
      title: mission.title,
      description: mission.description,
      points: mission.points,
      category: mission.category,
      kind: mission.kind,
      repeatable: mission.repeatable,
      status: last?.status ?? 'available',
      locked:
        approved && (!mission.repeatable || (availableAt ? availableAt > new Date() : false)),
      availableAt: availableAt?.toISOString() ?? null,
      completedAt: approved ? last.createdAt.toISOString() : null,
    };
  });
}

export async function pointsSummary(userId: string) {
  const [credits, debits, user] = await Promise.all([
    prisma.pointsEntry.aggregate({ where: { userId, points: { gt: 0 } }, _sum: { points: true } }),
    prisma.pointsEntry.aggregate({ where: { userId, points: { lt: 0 } }, _sum: { points: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
  ]);

  return {
    balance: user?.points ?? 0,
    accumulated: credits._sum.points ?? 0,
    redeemed: Math.abs(debits._sum.points ?? 0),
  };
}

export async function listPointsEntries(userId: string) {
  const entries = await prisma.pointsEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return entries.map((entry) => ({
    id: entry.id,
    points: entry.points,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  }));
}

/* ------------------------------------------------------------- recompensas */

export async function listRewards(userId: string) {
  const [rewards, user] = await Promise.all([
    prisma.reward.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { costPoints: 'asc' }],
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
  ]);

  const balance = user?.points ?? 0;

  return rewards.map((reward) => ({
    id: reward.id,
    slug: reward.slug,
    title: reward.title,
    description: reward.description ?? undefined,
    image: reward.image ?? undefined,
    costPoints: reward.costPoints,
    stock: reward.stock,
    soldOut: reward.stock != null && reward.stock <= 0,
    affordable: balance >= reward.costPoints,
  }));
}

export async function listRedemptions(userId: string) {
  const redemptions = await prisma.redemption.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { reward: true },
  });

  return redemptions.map((item) => ({
    id: item.id,
    status: item.status,
    costPoints: item.costPoints,
    createdAt: item.createdAt.toISOString(),
    reward: { title: item.reward.title, image: item.reward.image ?? undefined },
  }));
}

/* ---------------------------------------------------------------- afiliado */

export async function listAffiliateAccounts(userId: string) {
  const accounts = await prisma.affiliateAccount.findMany({ where: { userId } });
  const all = ['amazon', 'shopee', 'mercado_livre'] as const;

  return all.map((marketplace) => {
    const account = accounts.find((a) => a.marketplace === marketplace);
    return {
      marketplace,
      publicId: account?.publicId ?? null,
      hasSecret: Boolean(account?.secret),
      connected: Boolean(account?.publicId || account?.secret),
    };
  });
}

export async function listAffiliateLinks(userId: string) {
  const links = await prisma.affiliateLink.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return links.map((link) => ({
    id: link.id,
    marketplace: link.marketplace,
    originalUrl: link.originalUrl,
    affiliateUrl: link.affiliateUrl,
    title: link.title ?? undefined,
    createdAt: link.createdAt.toISOString(),
  }));
}

/* --------------------------------------------------------------- templates */

export async function listTemplates(userId: string) {
  const templates = await prisma.offerTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    marketplace: t.marketplace,
    body: t.body,
    updatedAt: t.updatedAt.toISOString(),
  }));
}

/* ----------------------------------------------------------------- páginas */

export async function listPages(userId: string, kind?: string) {
  const pages = await prisma.landingPage.findMany({
    where: { userId, ...(kind ? { kind } : {}) },
    orderBy: { updatedAt: 'desc' },
    include: { groups: { orderBy: { order: 'asc' } } },
  });

  return pages.map((page) => ({
    id: page.id,
    kind: page.kind,
    slug: page.slug,
    template: page.template,
    title: page.title,
    subtitle: page.subtitle ?? undefined,
    avatar: page.avatar ?? undefined,
    config: (page.config ?? {}) as Record<string, unknown>,
    rotationAuto: page.rotationAuto,
    defaultClickLimit: page.defaultClickLimit,
    published: page.published,
    views: page.views,
    updatedAt: page.updatedAt.toISOString(),
    groups: page.groups.map((g) => ({
      id: g.id,
      name: g.name,
      inviteUrl: g.inviteUrl,
      clickLimit: g.clickLimit,
      clicks: g.clicks,
      active: g.active,
    })),
  }));
}

export async function pageStats(pageId: string, range: string) {
  const days = range === '24h' ? 1 : range === '30d' ? 30 : range === 'all' ? 3650 : 7;
  const since = new Date(Date.now() - days * 86400_000);

  const page = await prisma.landingPage.findUnique({
    where: { id: pageId },
    include: { groups: { orderBy: { order: 'asc' } } },
  });
  if (!page) return null;

  const [clicks, total, last24h, lastHour] = await Promise.all([
    prisma.pageClick.findMany({
      where: { pageId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.pageClick.count({ where: { pageId } }),
    prisma.pageClick.count({
      where: { pageId, createdAt: { gte: new Date(Date.now() - 86400_000) } },
    }),
    prisma.pageClick.count({
      where: { pageId, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    }),
  ]);

  const tally = (key: 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm' | 'referrer' | 'device' | 'country') => {
    const counts = new Map<string, number>();
    for (const click of clicks) {
      const value = click[key];
      if (typeof value === 'string' && value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));
  };

  const series = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    series.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0);
  }
  for (const click of clicks) {
    const day = click.createdAt.toISOString().slice(0, 10);
    if (series.has(day)) series.set(day, (series.get(day) ?? 0) + 1);
  }

  const activeGroup = page.groups.find((g) => {
    const limit = g.clickLimit ?? page.defaultClickLimit;
    return g.active && (limit == null || g.clicks < limit);
  });

  return {
    range,
    clicksInRange: clicks.length,
    total,
    last24h,
    lastHour,
    activeGroup: activeGroup?.name ?? null,
    series: [...series.entries()].map(([date, count]) => ({ date, count })),
    utm: {
      source: tally('utmSource'),
      medium: tally('utmMedium'),
      campaign: tally('utmCampaign'),
      content: tally('utmContent'),
      term: tally('utmTerm'),
    },
    referrer: tally('referrer'),
    device: tally('device'),
    country: tally('country'),
    recent: clicks.slice(0, 20).map((c) => ({
      id: c.id,
      createdAt: c.createdAt.toISOString(),
      device: c.device,
      utmSource: c.utmSource,
      referrer: c.referrer,
    })),
  };
}

/* ----------------------------------------------------------- baú de anúncios */

export async function listAds(category?: string) {
  const ads = await prisma.adCreative.findMany({
    where: {
      active: true,
      ...(category && category !== 'todos' ? { category } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return ads.map((ad) => ({
    id: ad.id,
    title: ad.title,
    category: ad.category,
    image: ad.image,
    notes: ad.notes ?? undefined,
    downloads: ad.downloads,
    createdAt: ad.createdAt.toISOString(),
  }));
}

export const AD_CATEGORIES = [
  'geral',
  'beleza',
  'saude',
  'fitness',
  'moda',
  'casa',
  'tech',
] as const;
