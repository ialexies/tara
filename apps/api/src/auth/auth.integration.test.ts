import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module.js';

let app: NestFastifyApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
}, 30_000);

afterAll(async () => {
  await app?.close();
});

describe('POST /auth/register', () => {
  it('creates a guest account and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'guest@tara.ph', password: 'password123', role: 'guest' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ accessToken: string; refreshToken: string; user: { role: string } }>();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.role).toBe('guest');
  });

  it('creates an owner account', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'owner@hostel.ph', password: 'password123', role: 'owner' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ user: { role: string } }>().user.role).toBe('owner');
  });

  it('returns 409 for duplicate email', async () => {
    const payload = { email: 'dup@tara.ph', password: 'password123', role: 'guest' };
    await app.inject({ method: 'POST', url: '/auth/register', payload });
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload });
    expect(res.statusCode).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'not-an-email', password: 'password123', role: 'guest' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'short@tara.ph', password: 'short', role: 'guest' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/login', () => {
  const email = 'login@tara.ph';
  const password = 'loginpass123';

  beforeAll(async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password, role: 'guest' },
    });
  });

  it('returns tokens for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ accessToken: string; user: { email: string } }>();
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe(email);
  });

  it('returns 401 for wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ghost@nowhere.com', password },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /auth/me + POST /auth/refresh', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'me@tara.ph', password: 'mepass123', role: 'owner' },
    });
    const body = res.json<{ accessToken: string; refreshToken: string }>();
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('GET /auth/me returns current user for valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ email: string; role: string }>();
    expect(body.email).toBe('me@tara.ph');
    expect(body.role).toBe('owner');
  });

  it('GET /auth/me returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /auth/me returns 401 for garbage token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer not.a.token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/refresh returns new access token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ accessToken: string }>().accessToken).toBeDefined();
  });

  it('POST /auth/refresh returns 401 for invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'bad.refresh.token' },
    });
    expect(res.statusCode).toBe(401);
  });
});
