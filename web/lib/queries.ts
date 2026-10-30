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

function hiddenProviders(): string[] {
  return (process.env.CATALOG_HIDDEN_PROVIDERS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function listProducts(params: {
  /** Só vale para o TikTok Shop; Amazon e Shopee têm região própria. */
  region?: string;
  category?: string;
  q?: string;
  viral?: boolean;
  limit?: number;
  /** Bank Offers (ofertas próprias) ativas entram para todos; true inclui também as em rascunho (admin). */
  includeDraftBankOffers?: boolean;
}) {
  // três lojas no mesmo catálogo: 200 cortava o TikTok inteiro depois de Amazon e Shopee
  const take = Math.min(Math.max(1, params.limit ?? 2000), 3000);

  const products = await prisma.product.findMany({
    where: {
      // CATALOG_SHOW_DRAFTS=1 (só em preview) mostra também os produtos gravados
      // como rascunho por um provider em teste; produção segue só os ativos.
      // Bank Offers em rascunho (active=false) só para admins, que as revisam
      // antes de liberar; as ativas aparecem para todos.
      ...(process.env.CATALOG_SHOW_DRAFTS === '1'
        ? {}
        : params.includeDraftBankOffers
          ? { AND: [{ OR: [{ active: true }, { marketplace: 'bank_offers' }] }] }
          : { active: true }),
      // CATALOG_HIDDEN_PROVIDERS=apify esconde uma fonte sem desativar nada no
      // banco (o preview usa o mesmo Postgres da produção)
      ...(hiddenProviders().length ? { provider: { notIn: hiddenProviders() } } : {}),
      // produto sem foto não vai pra vitrine — card vazio parece bug
      image: { startsWith: 'http' },
      ...(params.region
        ? { OR: [{ marketplace: 'tiktok_shop', region: params.region }, { marketplace: { not: 'tiktok_shop' } }] }
        : {}),
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
    orderBy: [{ createdAt: 'desc' }, { isViral: 'desc' }, { salesCount: 'desc' }],
    take,
  });

  return products.map(serializeProduct);
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  return product ? serializeProduct(product) : null;
}

export type ProductVideoView = {
  id: string;
  videoId: string;
  title: string;
  url: string;
  creatorHandle: string;
  thumbnail?: string;
  views: number;
  revenue: number;
  likes: number;
  comments: number;
  isAd: boolean;
  /** ISO (só a data) ou undefined quando a fonte não informou. */
  publishedAt?: string;
  syncedAt: string;
};

export type ReferenceVideoView = ProductVideoView & {
  product: { id: string; name: string; image: string; category: string; currency: string };
};

/**
 * Todos os vídeos de referência do catálogo (aba Creators), do que mais
 * vendeu pro que menos, com o produto a que pertencem.
 */
export async function listReferenceVideos(limit = 300): Promise<ReferenceVideoView[]> {
  const videos = await prisma.productVideo.findMany({
    where: {
      product: {
        ...(process.env.CATALOG_SHOW_DRAFTS === '1' ? {} : { active: true }),
        image: { startsWith: 'http' },
      },
    },
    orderBy: [{ revenue: 'desc' }, { views: 'desc' }],
    take: Math.min(Math.max(1, limit), 1000),
    include: { product: { select: { id: true, name: true, image: true, category: true, currency: true } } },
  });
  return videos.map((video) => ({
    id: video.id,
    videoId: video.videoId,
    title: video.title,
    url: video.url,
    creatorHandle: video.creatorHandle,
    thumbnail: video.thumbnail || undefined,
    views: video.views,
    revenue: video.revenue,
    likes: video.likes,
    comments: video.comments,
    isAd: video.isAd,
    publishedAt: video.publishedAt?.toISOString().slice(0, 10),
    syncedAt: video.syncedAt.toISOString(),
    product: video.product,
  }));
}

/** Vídeos de referência do produto, do que mais vendeu pro que menos (máx. 5). */
export async function listProductVideos(productId: string): Promise<ProductVideoView[]> {
  const videos = await prisma.productVideo.findMany({
    where: { productId },
    orderBy: [{ revenue: 'desc' }, { views: 'desc' }],
    take: 5,
  });
  return videos.map((video) => ({
    id: video.id,
    videoId: video.videoId,
    title: video.title,
    url: video.url,
    creatorHandle: video.creatorHandle,
    thumbnail: video.thumbnail || undefined,
    views: video.views,
    revenue: video.revenue,
    likes: video.likes,
    comments: video.comments,
    isAd: video.isAd,
    publishedAt: video.publishedAt?.toISOString().slice(0, 10),
    syncedAt: video.syncedAt.toISOString(),
  }));
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
        // em revisão ou recusado: só a própria pessoa vê no perfil
        where: currentUserId === id ? {} : { OR: [{ reviewStatus: null }, { reviewStatus: 'approved' }] },
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

/* ------------------------------------------------------------- criadores */

export type TrendPointView = { d: string; r: number; v?: number; f?: number };

export type CreatorProductView = {
  id: string;
  productExternalId: string;
  /** Id no catálogo quando o produto também está nele (para linkar). */
  productId?: string;
  name: string;
  revenue: number;
  revenueGrowth?: number;
  salesCount: number;
  unitPrice?: number;
  commission?: number;
  launchDate?: string;
  /** Foto do catálogo, quando ligado. */
  image?: string;
};

export type CreatorVideoView = {
  id: string;
  videoId: string;
  title: string;
  url: string;
  thumbnail?: string;
  revenue: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isAd: boolean;
  adsRoas?: number;
  publishedAt?: string;
};

export type CreatorListItem = {
  id: string;
  externalId: string;
  handle: string;
  nickname: string;
  /** Foto de perfil (Blob); ausente = mostrar iniciais. */
  avatar?: string;
  /** Categoria interna predominante (beleza, moda...). */
  category?: string;
  /** INDEPENDENT, ou vinculado a loja. */
  status?: string;
  videoRevenue?: number;
  liveRevenue?: number;
  currency: string;
  rank?: number;
  revenue: number;
  revenueGrowth?: number;
  salesCount: number;
  followers?: number;
  newFollowers?: number;
  videoViews?: number;
  engagementRate?: number;
  unitPrice?: number;
  debutDate?: string;
  trend: TrendPointView[];
  topProducts: Array<{ name: string; revenue: number; productId?: string }>;
  favorite: boolean;
  rankSyncedAt?: string;
};

export type CreatorDetail = CreatorListItem & {
  bio?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  contactInstagram?: string;
  contactFacebook?: string;
  liveViews?: number;
  videoGpm?: number;
  liveGpm?: number;
  videoCount?: number;
  liveCount?: number;
  shopCount?: number;
  productCount?: number;
  profileSyncedAt?: string;
  videos: CreatorVideoView[];
  products: CreatorProductView[];
};

function trendOf(value: unknown): TrendPointView[] {
  if (!Array.isArray(value)) return [];
  return (value as Array<Record<string, unknown>>)
    .filter((p) => p && typeof p.d === 'string' && typeof p.r === 'number')
    .map((p) => ({
      d: String(p.d),
      r: Number(p.r),
      ...(typeof p.v === 'number' ? { v: p.v } : {}),
      ...(typeof p.f === 'number' ? { f: p.f } : {}),
    }));
}

const creatorBase = {
  id: true,
  externalId: true,
  handle: true,
  nickname: true,
  avatar: true,
  category: true,
  status: true,
  videoRevenue: true,
  liveRevenue: true,
  currency: true,
  rank: true,
  revenue: true,
  revenueGrowth: true,
  salesCount: true,
  followers: true,
  newFollowers: true,
  videoViews: true,
  engagementRate: true,
  unitPrice: true,
  debutDate: true,
  trend: true,
  rankSyncedAt: true,
} as const;

/** Top criadores ativos (ranking), com os 3 produtos mais vendidos e se é favorito. */
export async function listCreators(userId: string): Promise<CreatorListItem[]> {
  const [creators, favorites] = await Promise.all([
    prisma.creator.findMany({
      where: { active: true },
      orderBy: [{ rank: { sort: 'asc', nulls: 'last' } }, { revenue: 'desc' }],
      take: 400,
      select: {
        ...creatorBase,
        products: {
          orderBy: { revenue: 'desc' },
          take: 3,
          select: { name: true, revenue: true, productId: true },
        },
      },
    }),
    prisma.creatorFavorite.findMany({ where: { userId }, select: { creatorId: true } }),
  ]);
  const favorite = new Set(favorites.map((f) => f.creatorId));
  return creators.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    handle: c.handle,
    nickname: c.nickname,
    avatar: c.avatar || undefined,
    category: c.category ?? undefined,
    status: c.status ?? undefined,
    videoRevenue: c.videoRevenue ?? undefined,
    liveRevenue: c.liveRevenue ?? undefined,
    currency: c.currency,
    rank: c.rank ?? undefined,
    revenue: c.revenue,
    revenueGrowth: c.revenueGrowth ?? undefined,
    salesCount: c.salesCount,
    followers: c.followers ?? undefined,
    newFollowers: c.newFollowers ?? undefined,
    videoViews: c.videoViews ?? undefined,
    engagementRate: c.engagementRate ?? undefined,
    unitPrice: c.unitPrice ?? undefined,
    debutDate: c.debutDate?.toISOString().slice(0, 10),
    trend: trendOf(c.trend),
    topProducts: c.products.map((p) => ({ name: p.name, revenue: p.revenue, productId: p.productId ?? undefined })),
    favorite: favorite.has(c.id),
    rankSyncedAt: c.rankSyncedAt?.toISOString(),
  }));
}

/** Perfil completo do criador com vídeos (até 20) e produtos (até 20). */
export async function getCreator(id: string, userId: string): Promise<CreatorDetail | null> {
  const creator = await prisma.creator.findUnique({
    where: { id },
    include: {
      videos: { orderBy: [{ revenue: 'desc' }, { views: 'desc' }], take: 20 },
      products: { orderBy: { revenue: 'desc' }, take: 20 },
      favorites: { where: { userId }, select: { id: true } },
    },
  });
  if (!creator) return null;

  const linked = creator.products.filter((p) => p.productId).map((p) => p.productId!);
  const images = linked.length
    ? await prisma.product.findMany({ where: { id: { in: linked } }, select: { id: true, image: true } })
    : [];
  const imageOf = new Map(images.map((p) => [p.id, p.image]));

  return {
    id: creator.id,
    externalId: creator.externalId,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar || undefined,
    category: creator.category ?? undefined,
    currency: creator.currency,
    rank: creator.rank ?? undefined,
    revenue: creator.revenue,
    revenueGrowth: creator.revenueGrowth ?? undefined,
    salesCount: creator.salesCount,
    followers: creator.followers ?? undefined,
    newFollowers: creator.newFollowers ?? undefined,
    videoViews: creator.videoViews ?? undefined,
    engagementRate: creator.engagementRate ?? undefined,
    unitPrice: creator.unitPrice ?? undefined,
    debutDate: creator.debutDate?.toISOString().slice(0, 10),
    trend: trendOf(creator.trend),
    topProducts: creator.products.slice(0, 3).map((p) => ({ name: p.name, revenue: p.revenue, productId: p.productId ?? undefined })),
    favorite: creator.favorites.length > 0,
    rankSyncedAt: creator.rankSyncedAt?.toISOString(),
    status: creator.status ?? undefined,
    bio: creator.bio ?? undefined,
    contactEmail: creator.contactEmail ?? undefined,
    contactWhatsapp: creator.contactWhatsapp ?? undefined,
    contactInstagram: creator.contactInstagram ?? undefined,
    contactFacebook: creator.contactFacebook ?? undefined,
    videoRevenue: creator.videoRevenue ?? undefined,
    liveRevenue: creator.liveRevenue ?? undefined,
    liveViews: creator.liveViews ?? undefined,
    videoGpm: creator.videoGpm ?? undefined,
    liveGpm: creator.liveGpm ?? undefined,
    videoCount: creator.videoCount ?? undefined,
    liveCount: creator.liveCount ?? undefined,
    shopCount: creator.shopCount ?? undefined,
    productCount: creator.productCount ?? undefined,
    profileSyncedAt: creator.profileSyncedAt?.toISOString(),
    videos: creator.videos.map((v) => ({
      id: v.id,
      videoId: v.videoId,
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail || undefined,
      revenue: v.revenue,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      isAd: v.isAd,
      adsRoas: v.adsRoas ?? undefined,
      publishedAt: v.publishedAt?.toISOString().slice(0, 10),
    })),
    products: creator.products.map((p) => ({
      id: p.id,
      productExternalId: p.productExternalId,
      productId: p.productId ?? undefined,
      name: p.name,
      revenue: p.revenue,
      revenueGrowth: p.revenueGrowth ?? undefined,
      salesCount: p.salesCount,
      unitPrice: p.unitPrice ?? undefined,
      commission: p.commission ?? undefined,
      launchDate: p.launchDate?.toISOString().slice(0, 10),
      image: p.productId ? imageOf.get(p.productId) : undefined,
    })),
  };
}
