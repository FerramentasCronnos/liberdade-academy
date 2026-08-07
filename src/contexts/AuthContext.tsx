import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

const AUTH_STORAGE_KEY = '@liberdade_academy_user';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const MOCK_USER: User = {
  id: '1',
  name: 'Thais Maximiana',
  email: 'thais@liberdadeacademy.com',
  level: 12,
  xp: 2450,
  rank: 6,
  joinedAt: '2026-01-15',
  stats: {
    productsViewed: 342,
    salesMade: 87,
    communityPosts: 24,
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw) as User);
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const persistUser = async (next: User | null) => {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!email.includes('@') || password.length < 4) {
      throw new Error('E-mail ou senha inválidos.');
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
    await persistUser({ ...MOCK_USER, email });
  };

  const signUp = async (name: string, email: string, password: string) => {
    if (!name.trim() || !email.includes('@') || password.length < 6) {
      throw new Error('Preencha os dados corretamente.');
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
    await persistUser({
      ...MOCK_USER,
      id: String(Date.now()),
      name,
      email,
      level: 1,
      xp: 0,
      rank: 99,
      joinedAt: new Date().toISOString().slice(0, 10),
      stats: { productsViewed: 0, salesMade: 0, communityPosts: 0 },
    });
  };

  const signOut = async () => {
    await persistUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
