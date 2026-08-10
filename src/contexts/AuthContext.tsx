import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingProfile, User } from '../types';
import { api, isApiEnabled, setToken } from '../services/apiClient';

const SESSION_KEY = '@liberdade_academy_session';
const USERS_KEY = '@liberdade_academy_users';

type AuthResult = { needsOnboarding: boolean };
type UsersMap = Record<string, User & { passwordHash?: string }>;

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  usingApi: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  completeOnboarding: (profile: Omit<OnboardingProfile, 'completedAt'>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

function normalizeUser(raw: Partial<User> & Pick<User, 'id' | 'name' | 'email'>): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    avatar: raw.avatar,
    level: raw.level ?? 1,
    xp: raw.xp ?? 0,
    rank: raw.rank ?? 99,
    joinedAt: raw.joinedAt ?? new Date().toISOString().slice(0, 10),
    onboardingCompleted: Boolean(raw.onboardingCompleted),
    onboarding: raw.onboarding,
    stats: raw.stats ?? {
      productsViewed: 0,
      salesMade: 0,
      communityPosts: 0,
    },
  };
}

async function readUsers(): Promise<UsersMap> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as UsersMap) : {};
}

async function writeLocalUser(user: User) {
  const users = await readUsers();
  users[user.email.toLowerCase()] = user;
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const usingApi = isApiEnabled();

  useEffect(() => {
    (async () => {
      try {
        if (usingApi) {
          const me = await api.me();
          setUser(me.user);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(me.user));
          return;
        }
      } catch {
        // token inválido / API offline → tenta sessão local
      }

      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<User>;
        if (parsed?.id && parsed?.email && parsed?.name) {
          setUser(normalizeUser(parsed as User));
        }
      }
    })()
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [usingApi]);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (usingApi) {
      const result = await api.login(email, password);
      await setToken(result.token);
      setUser(result.user);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
      return { needsOnboarding: result.needsOnboarding };
    }

    if (!email.includes('@') || password.length < 4) {
      throw new Error('E-mail ou senha inválidos.');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));

    const key = email.toLowerCase();
    const users = await readUsers();
    const existing = users[key];

    if (existing) {
      const next = normalizeUser({ ...existing, email });
      setUser(next);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return { needsOnboarding: !next.onboardingCompleted };
    }

    const next = normalizeUser({
      id: String(Date.now()),
      name: email.split('@')[0],
      email,
      onboardingCompleted: false,
    });
    setUser(next);
    await writeLocalUser(next);
    return { needsOnboarding: true };
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    if (usingApi) {
      const result = await api.register(name, email, password);
      await setToken(result.token);
      setUser(result.user);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
      return { needsOnboarding: result.needsOnboarding };
    }

    if (!name.trim() || !email.includes('@') || password.length < 6) {
      throw new Error('Preencha os dados corretamente.');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));

    const next = normalizeUser({
      id: String(Date.now()),
      name,
      email,
      onboardingCompleted: false,
    });
    setUser(next);
    await writeLocalUser(next);
    return { needsOnboarding: true };
  };

  const completeOnboarding = async (
    profile: Omit<OnboardingProfile, 'completedAt'>,
  ) => {
    if (!user) return;

    if (usingApi) {
      const result = await api.completeOnboarding(profile);
      setUser(result.user);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
      return;
    }

    const next: User = {
      ...user,
      onboardingCompleted: true,
      onboarding: {
        ...profile,
        completedAt: new Date().toISOString(),
      },
    };
    setUser(next);
    await writeLocalUser(next);
  };

  const signOut = async () => {
    setUser(null);
    await setToken(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        needsOnboarding: !!user && !user.onboardingCompleted,
        usingApi,
        signIn,
        signUp,
        completeOnboarding,
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
