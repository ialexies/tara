import { cookies } from 'next/headers';
import { verifyAccessToken, type TokenPayload } from '@tara/auth';

const ACCESS_COOKIE = 'tara_access';
const REFRESH_COOKIE = 'tara_refresh';

export async function getSession(): Promise<TokenPayload | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const secret = process.env['JWT_SECRET'];
  if (!secret) return null;

  try {
    return await verifyAccessToken(token, secret);
  } catch {
    return null;
  }
}

export async function setSessionCookies(accessToken: string, refreshToken: string): Promise<void> {
  const jar = await cookies();
  const secure = process.env['NODE_ENV'] === 'production';

  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 min
  });

  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
