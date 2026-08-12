export type OnboardingNiche =
  | 'beleza'
  | 'saude'
  | 'fisico'
  | 'digital'
  | 'moda'
  | 'casa'
  | 'tech'
  | 'fitness';

export type RevenueRange =
  | 'ate_5k'
  | '5k_15k'
  | '15k_50k'
  | '50k_mais';

export type PlatformGoal =
  | 'primeira_venda'
  | 'escalar'
  | 'trocar_nicho'
  | 'comunidade'
  | 'renda_extra';

export interface OnboardingProfile {
  niche: OnboardingNiche;
  alreadySelling: boolean;
  revenueRange?: RevenueRange;
  goal: PlatformGoal;
  completedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  rank: number;
  joinedAt: string;
  onboardingCompleted: boolean;
  onboarding?: OnboardingProfile;
  stats: {
    productsViewed: number;
    salesMade: number;
    communityPosts: number;
  };
}

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  category: ProductCategory;
  supplier: string;
  rating: number;
  salesCount: number;
  tiktokViews?: number;
  isViral: boolean;
  /** Ausente quando a fonte não informa a comissão — não exibir chute. */
  commission?: number;
  description: string;
  supplierShips: boolean;
  /** Mercado do produto. Ausente em produtos do catálogo demo local. */
  region?: ProductRegion;
  /** Moeda do preço (BRL / USD). Default BRL quando ausente. */
  currency?: string;
  /** Link do produto no TikTok Shop, quando o provider devolve. */
  productUrl?: string;
}

export type ProductRegion = 'BR' | 'US';

export type ProductCategory =
  | 'beleza'
  | 'saude'
  | 'fisico'
  | 'digital'
  | 'moda'
  | 'casa'
  | 'tech'
  | 'fitness';

export interface CommunityPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    level: number;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
  category: 'dica' | 'resultado' | 'duvida' | 'motivacao';
}

export interface RankingUser {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  rank: number;
  salesCount: number;
  badge?: string;
}
