export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  rank: number;
  joinedAt: string;
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
  commission: number;
  description: string;
  supplierShips: boolean;
}

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
