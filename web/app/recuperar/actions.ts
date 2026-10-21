'use server';

import { redirect } from 'next/navigation';
import { requestPasswordReset, resetPasswordWithToken } from '@/lib/password-reset';

export type RecoverState = { done?: boolean; error?: string };

/** Sempre responde igual: não revela se o e-mail existe ou está bloqueado. */
export async function requestReset(_prev: RecoverState, formData: FormData): Promise<RecoverState> {
  const email = String(formData.get('email') || '').trim();
  if (!email.includes('@')) return { error: 'Escribe tu correo.' };
  try {
    const result = await requestPasswordReset(email);
    if (!result.sent && result.reason && !['not_found', 'inactive', 'email'].includes(result.reason)) {
      console.error('[recuperar] e-mail não enviado', result.reason);
    }
  } catch (error) {
    console.error('[recuperar]', error);
  }
  return { done: true };
}

export type ResetState = { error?: string };

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get('token') || '');
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' };
  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) return { error: result.error };
  redirect('/login?reset=1');
}
