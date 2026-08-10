import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CommunityPost,
  OnboardingProfile,
  Product,
  RankingUser,
  User,
} from '../types';

const TOKEN_KEY = '@liberdade_academy_token';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export function isApiEnabled() {
  return Boolean(API_URL);
}

type AuthResponse = {
  token: string;
  needsOnboarding: boolean;
  user: User;
};

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error('API não configurada');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Erro ${response.status}`);
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health', { auth: false }),

  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>('/auth/me'),

  completeOnboarding: (profile: Omit<OnboardingProfile, 'completedAt'>) =>
    request<{ user: User }>('/users/me/onboarding', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  products: (params?: { category?: string; q?: string; viral?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.category) search.set('category', params.category);
    if (params?.q) search.set('q', params.q);
    if (params?.viral) search.set('viral', 'true');
    const qs = search.toString();
    return request<{ products: Product[] }>(`/products${qs ? `?${qs}` : ''}`, {
      auth: false,
    });
  },

  product: (id: string) =>
    request<{ product: Product }>(`/products/${id}`, { auth: false }),

  posts: (category?: string) => {
    const qs = category && category !== 'todos' ? `?category=${category}` : '';
    return request<{ posts: CommunityPost[] }>(`/posts${qs}`);
  },

  createPost: (content: string, category: CommunityPost['category']) =>
    request<{ post: CommunityPost }>('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, category }),
    }),

  toggleLike: (postId: string) =>
    request<{ post: CommunityPost }>(`/posts/${postId}/like`, { method: 'POST' }),

  ranking: () => request<{ ranking: RankingUser[] }>('/ranking'),

  selling: () =>
    request<{ productIds: string[]; products: Product[] }>('/me/selling'),

  addSelling: (productId: string) =>
    request<{ selling: boolean }>(`/me/selling/${productId}`, { method: 'POST' }),

  removeSelling: (productId: string) =>
    request<{ selling: boolean }>(`/me/selling/${productId}`, {
      method: 'DELETE',
    }),

  notifications: () =>
    request<{
      notifications: Array<{
        id: string;
        title: string;
        body: string;
        route?: string;
        createdAt: string;
        read: boolean;
      }>;
      unreadCount: number;
    }>('/notifications'),

  markNotificationsRead: () =>
    request<{ ok: boolean }>('/notifications/read', { method: 'POST' }),
};
