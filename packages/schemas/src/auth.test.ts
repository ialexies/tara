import { describe, it, expect } from 'vitest';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.js';

describe('RegisterSchema', () => {
  it('accepts valid guest registration', () => {
    const result = RegisterSchema.safeParse({
      email: 'maria@example.com',
      password: 'password123',
      fullName: 'Maria Santos',
      role: 'guest',
    });
    expect(result.success).toBe(true);
  });

  it('defaults role to guest when omitted', () => {
    const result = RegisterSchema.safeParse({ email: 'a@b.com', password: '12345678' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe('guest');
  });

  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = RegisterSchema.safeParse({ email: 'a@b.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown role', () => {
    const result = RegisterSchema.safeParse({
      email: 'a@b.com',
      password: '12345678',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('accepts owner role', () => {
    const result = RegisterSchema.safeParse({
      email: 'owner@hostel.ph',
      password: 'securepass',
      role: 'owner',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe('owner');
  });
});

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('RefreshSchema', () => {
  it('accepts a refresh token string', () => {
    const result = RefreshSchema.safeParse({ refreshToken: 'some.jwt.token' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = RefreshSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});
