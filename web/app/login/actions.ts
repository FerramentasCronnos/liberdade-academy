'use server';

import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { clearToken, setToken } from '@/lib/session';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Completa el correo y la contraseña.' };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'No pude conectar con la API. ¿El stack está activo?' };
  }

  if (!response.ok) {
    // não revelamos se foi o e-mail ou a senha que errou
    return { error: 'Correo o contraseña inválidos.' };
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) return { error: 'La API no devolvió un token.' };

  await setToken(data.token);
  redirect('/catalogo');
}

export async function logout() {
  await clearToken();
  redirect('/login');
}
