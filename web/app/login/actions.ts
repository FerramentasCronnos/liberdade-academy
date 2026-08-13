'use server';

import { redirect } from 'next/navigation';
import { authenticate, DomainError } from '@/lib/mutations';
import { createSession, destroySession } from '@/lib/session';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) return { error: 'Completa el correo y la contraseña.' };

  try {
    const user = await authenticate(email, password);
    await createSession(user.id);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    return { error: 'No pude conectar con la base de datos.' };
  }

  redirect('/catalogo');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
