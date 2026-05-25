'use server';

import { redirect } from 'next/navigation';
import { LoginSchema, RegisterSchema } from '@tara/schemas';
import { setSessionCookies, clearSessionCookies } from './session';

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

type AuthResult = { error: string } | null;

export async function loginAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { error: body.message ?? 'Login failed' };
    }

    const { accessToken, refreshToken } = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    await setSessionCookies(accessToken, refreshToken);
  } catch {
    return { error: 'Could not connect to server. Please try again.' };
  }

  redirect('/en');
}

export async function registerAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName') || undefined,
    role: formData.get('role') ?? 'guest',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { error: body.message ?? 'Registration failed' };
    }

    const { accessToken, refreshToken } = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    await setSessionCookies(accessToken, refreshToken);
  } catch {
    return { error: 'Could not connect to server. Please try again.' };
  }

  redirect('/en');
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookies();
  redirect('/en/login');
}
