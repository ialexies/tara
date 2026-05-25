import { describe, it, expect } from 'vitest';
import { signTokens, verifyAccessToken, verifyRefreshToken } from './jwt.js';

const SECRET = 'test-secret-at-least-32-characters-long!!';

const BASE_PAYLOAD = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@tara.ph',
  role: 'guest' as const,
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
};

describe('signTokens', () => {
  it('returns accessToken and refreshToken', async () => {
    const { accessToken, refreshToken } = await signTokens(BASE_PAYLOAD, SECRET);
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(typeof accessToken).toBe('string');
    expect(typeof refreshToken).toBe('string');
  });

  it('access token has 3 JWT segments', async () => {
    const { accessToken } = await signTokens(BASE_PAYLOAD, SECRET);
    expect(accessToken.split('.')).toHaveLength(3);
  });
});

describe('verifyAccessToken', () => {
  it('returns payload for valid token', async () => {
    const { accessToken } = await signTokens(BASE_PAYLOAD, SECRET);
    const payload = await verifyAccessToken(accessToken, SECRET);

    expect(payload.sub).toBe(BASE_PAYLOAD.sub);
    expect(payload.email).toBe(BASE_PAYLOAD.email);
    expect(payload.role).toBe(BASE_PAYLOAD.role);
    expect(payload.tenantId).toBe(BASE_PAYLOAD.tenantId);
  });

  it('throws for wrong secret', async () => {
    const { accessToken } = await signTokens(BASE_PAYLOAD, SECRET);
    await expect(verifyAccessToken(accessToken, 'wrong-secret')).rejects.toThrow();
  });

  it('throws for refresh token presented as access token', async () => {
    const { refreshToken } = await signTokens(BASE_PAYLOAD, SECRET);
    await expect(verifyAccessToken(refreshToken, SECRET)).rejects.toThrow();
  });

  it('throws for tampered token', async () => {
    const { accessToken } = await signTokens(BASE_PAYLOAD, SECRET);
    const tampered = accessToken.slice(0, -5) + 'XXXXX';
    await expect(verifyAccessToken(tampered, SECRET)).rejects.toThrow();
  });
});

describe('verifyRefreshToken', () => {
  it('returns the user id (sub) for valid refresh token', async () => {
    const { refreshToken } = await signTokens(BASE_PAYLOAD, SECRET);
    const userId = await verifyRefreshToken(refreshToken, SECRET);
    expect(userId).toBe(BASE_PAYLOAD.sub);
  });

  it('throws for access token presented as refresh token', async () => {
    const { accessToken } = await signTokens(BASE_PAYLOAD, SECRET);
    await expect(verifyRefreshToken(accessToken, SECRET)).rejects.toThrow();
  });
});
