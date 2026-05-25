import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { UserRole } from './rbac.js';

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
};

type RawPayload = JWTPayload & TokenPayload;

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

const ISSUER = 'tara-api';
const ACCESS_AUD = 'tara:access';
const REFRESH_AUD = 'tara:refresh';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signTokens(payload: TokenPayload, secret: string): Promise<TokenPair> {
  const key = encodeSecret(secret);
  const base = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  };

  const accessToken = await new SignJWT(base)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(ACCESS_AUD)
    .setExpirationTime(ACCESS_TTL)
    .sign(key);

  const refreshToken = await new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(REFRESH_AUD)
    .setExpirationTime(REFRESH_TTL)
    .sign(key);

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string, secret: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify<RawPayload>(token, encodeSecret(secret), {
    issuer: ISSUER,
    audience: ACCESS_AUD,
  });
  return {
    sub: payload.sub as string,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  };
}

export async function verifyRefreshToken(token: string, secret: string): Promise<string> {
  const { payload } = await jwtVerify(token, encodeSecret(secret), {
    issuer: ISSUER,
    audience: REFRESH_AUD,
  });
  return payload.sub as string;
}
