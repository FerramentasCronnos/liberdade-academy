import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_POSTS } from '../services/mockData';
import type { CommunityPost } from '../types';
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
  notifications: AppNotification[];
  unreadCount: number;
  addPost: (content: string, category: CommunityPost['category']) => void;
  toggleLike: (postId: string) => void;
  toggleSelling: (productId: string) => boolean;
  isSelling: (productId: string) => boolean;
  markNotificationsRead: () => void;
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
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS);
  const [sellingIds, setSellingIds] = useState<string[]>([]);
  const [readNotif, setReadNotif] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(POSTS_KEY),
      AsyncStorage.getItem(SELLING_KEY),
      AsyncStorage.getItem(NOTIFS_KEY),
    ]).then(([postsRaw, sellingRaw, notifsRaw]) => {
      if (postsRaw) setPosts(JSON.parse(postsRaw));
      if (sellingRaw) setSellingIds(JSON.parse(sellingRaw));
      if (notifsRaw) setReadNotif(notifsRaw === '1');
    });
  }, []);

  const addPost = (content: string, category: CommunityPost['category']) => {
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

  const toggleLike = (postId: string) => {
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

  const toggleSelling = (productId: string) => {
    const exists = sellingIds.includes(productId);
    const next = exists
      ? sellingIds.filter((id) => id !== productId)
      : [...sellingIds, productId];
    setSellingIds(next);
    void AsyncStorage.setItem(SELLING_KEY, JSON.stringify(next));
    return !exists;
  };

  const markNotificationsRead = () => {
    setReadNotif(true);
    void AsyncStorage.setItem(NOTIFS_KEY, '1');
  };

  const value = useMemo(
    () => ({
      posts,
      sellingIds,
      notifications: DEFAULT_NOTIFICATIONS,
      unreadCount: readNotif ? 0 : DEFAULT_NOTIFICATIONS.length,
      addPost,
      toggleLike,
      toggleSelling,
      isSelling: (id: string) => sellingIds.includes(id),
      markNotificationsRead,
    }),
    [posts, sellingIds, readNotif, user],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}
