import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_POSTS } from '../services/mockData';
import { api, isApiEnabled } from '../services/apiClient';
import type { CommunityPost, Product } from '../types';
import { useAuth } from './AuthContext';

const POSTS_KEY = '@liberdade_academy_posts';
const SELLING_KEY = '@liberdade_academy_selling';
const NOTIFS_KEY = '@liberdade_academy_notifs_read';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  route?: string;
  createdAt: string;
};

interface AppDataContextData {
  posts: CommunityPost[];
  sellingIds: string[];
  sellingProducts: Product[];
  notifications: AppNotification[];
  unreadCount: number;
  refreshPosts: (category?: string) => Promise<void>;
  addPost: (content: string, category: CommunityPost['category']) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSelling: (productId: string) => Promise<boolean>;
  isSelling: (productId: string) => boolean;
  markNotificationsRead: () => Promise<void>;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Produto viral do dia',
    body: 'Sérum Vitamina C Premium está em alta no TikTok.',
    route: '/product/1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    title: 'Ranking atualizado',
    body: 'Você está em #6 na classificação da semana.',
    route: '/(tabs)/ranking',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n3',
    title: 'Nova postagem',
    body: 'Ana Clara compartilhou um resultado na comunidade.',
    route: '/(tabs)/community',
    createdAt: new Date().toISOString(),
  },
];

const AppDataContext = createContext<AppDataContextData>({} as AppDataContextData);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const usingApi = isApiEnabled();
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS);
  const [sellingIds, setSellingIds] = useState<string[]>([]);
  const [sellingProducts, setSellingProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(DEFAULT_NOTIFICATIONS.length);

  const loadRemote = async () => {
    if (!usingApi || !isAuthenticated) return;
    try {
      const [postsRes, sellingRes, notifRes] = await Promise.all([
        api.posts(),
        api.selling(),
        api.notifications(),
      ]);
      setPosts(postsRes.posts);
      setSellingIds(sellingRes.productIds);
      setSellingProducts(sellingRes.products);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
    } catch {
      // mantém local
    }
  };

  useEffect(() => {
    if (usingApi && isAuthenticated) {
      void loadRemote();
      return;
    }

    Promise.all([
      AsyncStorage.getItem(POSTS_KEY),
      AsyncStorage.getItem(SELLING_KEY),
      AsyncStorage.getItem(NOTIFS_KEY),
    ]).then(([postsRaw, sellingRaw, notifsRaw]) => {
      if (postsRaw) setPosts(JSON.parse(postsRaw));
      if (sellingRaw) setSellingIds(JSON.parse(sellingRaw));
      if (notifsRaw === '1') setUnreadCount(0);
    });
  }, [usingApi, isAuthenticated, user?.id]);

  const refreshPosts = async (category?: string) => {
    if (usingApi && isAuthenticated) {
      const res = await api.posts(category);
      setPosts(res.posts);
      return;
    }
  };

  const addPost = async (content: string, category: CommunityPost['category']) => {
    if (usingApi && isAuthenticated) {
      const res = await api.createPost(content, category);
      setPosts((prev) => [res.post, ...prev]);
      return;
    }

    const post: CommunityPost = {
      id: String(Date.now()),
      author: {
        id: user?.id ?? 'guest',
        name: user?.name ?? 'Membro',
        level: user?.level ?? 1,
      },
      content: content.trim(),
      likes: 0,
      comments: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      category,
    };
    setPosts((prev) => {
      const next = [post, ...prev];
      void AsyncStorage.setItem(POSTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleLike = async (postId: string) => {
    if (usingApi && isAuthenticated) {
      const res = await api.toggleLike(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
      return;
    }

    setPosts((prev) => {
      const next = prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      );
      void AsyncStorage.setItem(POSTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleSelling = async (productId: string) => {
    const exists = sellingIds.includes(productId);

    if (usingApi && isAuthenticated) {
      if (exists) await api.removeSelling(productId);
      else await api.addSelling(productId);
      const sellingRes = await api.selling();
      setSellingIds(sellingRes.productIds);
      setSellingProducts(sellingRes.products);
      return !exists;
    }

    const next = exists
      ? sellingIds.filter((id) => id !== productId)
      : [...sellingIds, productId];
    setSellingIds(next);
    void AsyncStorage.setItem(SELLING_KEY, JSON.stringify(next));
    return !exists;
  };

  const markNotificationsRead = async () => {
    if (usingApi && isAuthenticated) {
      await api.markNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      return;
    }
    setUnreadCount(0);
    void AsyncStorage.setItem(NOTIFS_KEY, '1');
  };

  const value = useMemo(
    () => ({
      posts,
      sellingIds,
      sellingProducts,
      notifications,
      unreadCount,
      refreshPosts,
      addPost,
      toggleLike,
      toggleSelling,
      isSelling: (id: string) => sellingIds.includes(id),
      markNotificationsRead,
    }),
    [posts, sellingIds, sellingProducts, notifications, unreadCount, user],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}
