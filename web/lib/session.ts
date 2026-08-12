import { cookies } from 'next/headers';
import { API_URL } from './api';

const COOKIE = 'la_token';

export interface Tier {
  current: { id: string; label: string; min: number };
  next: { id: string; label: string; min: number } | null;
  /** 0–1 até o próximo nível. */
  progress: number;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  instagram?: string;
  tiktok?: string;
  points: number;
  tier: Tier;
  level: number;
  xp: number;
  rank: number;
  joinedAt: string;
  onboardingCompleted: boolean;
  stats: { productsViewed: number; salesMade: number; communityPosts: number };
}

/** Next 16: cookies() é assíncrono. */
export async function getToken() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setToken(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, // fora do alcance de JS — evita roubo por XSS
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearToken() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Chamada autenticada à API. Devolve null em 401 para o chamador redirecionar. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = await getToken();
  if (!token) return null;

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401) return null;

  if (!response.ok) {
    // repassa a mensagem da API — é ela que explica "pontos insuficientes",
    // "já tem envio em análise" etc. para o usuário
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `API respondeu ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const data = await apiFetch<{ user: SessionUser }>('/users/me');
    return data?.user ?? null;
  } catch {
    return null;
  }
}
