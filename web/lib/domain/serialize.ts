import type { Product, User, Post, PostLike, Comment } from '@prisma/client';
import { estimatedCommission } from './commission';
import { tierFor } from './tiers';
import { planInfo } from './plans';
import { purchaseTier } from '../purchase-tier';

type UserWithStats = User;

export function serializeUser(user: UserWithStats) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    instagram: user.instagram ?? undefined,
    tiktok: user.tiktok ?? undefined,
    points: user.points,
    tier: tierFor(user.points),
    plan: planInfo(user.plan, user.planExpiresAt),
    isAdmin: user.isAdmin,
    /** Assinatura à parte da aba Creators (Stripe). A regra fica em lib/creators-access. */
    purchases: user.purchases,
    purchaseTier: purchaseTier(user.purchases),
    creatorsAccess: user.creatorsAccess,
    creatorsAccessUntil: user.creatorsAccessUntil?.toISOString() ?? undefined,
    level: user.level,
    xp: user.xp,
    rank: user.rank,
    joinedAt: user.joinedAt.toISOString().slice(0, 10),
    onboardingCompleted: user.onboardingCompleted,
    onboarding: user.onboardingCompleted
      ? {
          niche: user.niche,
          alreadySelling: Boolean(user.alreadySelling),
          revenueRange: user.revenueRange ?? undefined,
          goal: user.goal,
          completedAt: user.onboardingAt?.toISOString() ?? user.joinedAt.toISOString(),
        }
      : undefined,
    stats: {
      productsViewed: user.productsViewed,
      salesMade: user.salesMade,
      communityPosts: user.communityPosts,
    },
  };
}

export function serializeProduct(product: Product) {
  return {
    id: product.id,
    externalId: product.externalId ?? undefined,
    name: product.name,
    image: product.image,
    price: product.price,
    /** Teto da faixa de preço; ausente = preço único. */
    priceMax: product.priceMax ?? undefined,
    category: product.category,
    supplier: product.supplier,
    rating: product.rating,
    salesCount: product.salesCount,
    tiktokViews: product.tiktokViews ?? undefined,
    isViral: product.isViral,
    /** Taxa vinda da fonte. Ausente = a fonte não informou. */
    commission: product.commission ?? undefined,
    /** Comissão fixa por venda (Bank Offers); quando existe, vale no lugar do percentual. */
    commissionAmount: product.commissionAmount ?? undefined,
    commissionAmountMax: product.commissionAmountMax ?? undefined,
    /** Recursos do afiliado (Bank Offers). */
    resources: Array.isArray(product.resources)
      ? (product.resources as Array<{ kind?: string; label?: string; url?: string }>)
          .filter((r) => r && typeof r.url === 'string' && typeof r.label === 'string')
          .map((r) => ({ kind: String(r.kind ?? 'link'), label: String(r.label), url: String(r.url) }))
      : undefined,
    /** Taxa configurada por categoria. A UI precisa rotular como estimativa. */
    commissionEstimated:
      product.commission == null
        ? (estimatedCommission(product.category, product.region) ?? undefined)
        : undefined,
    description: product.description,
    supplierShips: product.supplierShips,
    region: product.region,
    currency: product.currency,
    productUrl: product.productUrl ?? undefined,
    marketplace: product.marketplace,
    /** Entrou no catálogo nos últimos 14 dias. */
    isNew: Date.now() - product.createdAt.getTime() < 14 * 86_400_000,
    createdAt: product.createdAt.toISOString(),
    images: product.images.length ? product.images : [product.image],
    metrics:
      product.revenue == null
        ? undefined
        : {
            revenue: product.revenue,
            revenueGrowth: product.revenueGrowth ?? undefined,
            unitPrice: product.unitPrice ?? undefined,
            videoRevenue: product.videoRevenue ?? undefined,
            liveRevenue: product.liveRevenue ?? undefined,
            reviewCount: product.reviewCount ?? undefined,
            creatorCount: product.creatorCount ?? undefined,
            videoCount: product.videoCount ?? undefined,
            launchDate: product.launchDate?.toISOString().slice(0, 10),
            trend: Array.isArray(product.revenueTrend)
              ? (product.revenueTrend as Array<{ d: string; r: number }>).map((p) => ({ d: String(p.d), r: Number(p.r) }))
              : [],
          },
  };
}

type PostFull = Post & {
  author: User;
  likes: PostLike[];
  comments: Comment[];
};

export function serializePost(post: PostFull, currentUserId?: string) {
  return {
    id: post.id,
    author: {
      id: post.author.id,
      name: post.author.name,
      avatar: post.author.avatar ?? undefined,
      level: post.author.level,
      isAdmin: post.author.isAdmin,
    },
    title: post.title ?? undefined,
    pinned: post.pinned,
    tags: post.tags,
    attachments: post.attachments,
    content: post.content,
    image: post.image ?? undefined,
    likes: post.likes.length,
    comments: post.comments.length,
    isLiked: currentUserId
      ? post.likes.some((like) => like.userId === currentUserId)
      : false,
    createdAt: post.createdAt.toISOString(),
    category: post.category,
  };
}
