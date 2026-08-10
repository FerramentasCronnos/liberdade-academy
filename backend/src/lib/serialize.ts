import type { Product, User, Post, PostLike, Comment } from '@prisma/client';

type UserWithStats = User;

export function serializeUser(user: UserWithStats) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? undefined,
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
    name: product.name,
    image: product.image,
    price: product.price,
    category: product.category,
    supplier: product.supplier,
    rating: product.rating,
    salesCount: product.salesCount,
    tiktokViews: product.tiktokViews ?? undefined,
    isViral: product.isViral,
    commission: product.commission,
    description: product.description,
    supplierShips: product.supplierShips,
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
    },
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
