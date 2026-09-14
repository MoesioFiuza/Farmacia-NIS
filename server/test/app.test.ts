import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import type { Database } from '../src/db.js';

const config: Config = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3001,
  DATABASE_URL: 'postgres://unused',
  JWT_SECRET: 'test-secret-with-at-least-thirty-two-characters',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_DAYS: 30,
  CORS_ORIGINS: 'http://localhost:5173',
  TRUST_PROXY: false,
  LOG_LEVEL: 'silent'
};

const fakeDb = (() => Promise.resolve([])) as unknown as Database;
let app: FastifyInstance | undefined;
afterEach(async () => app?.close());

describe('API', () => {
  it('responde ao health check sem expor detalhes', async () => {
    app = await buildApp({ config, database: fakeDb, logger: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('protege recursos clínicos sem JWT', async () => {
    app = await buildApp({ config, database: fakeDb, logger: false });
    const response = await app.inject({ method: 'GET', url: '/api/v1/patients' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Token ausente ou inválido' });
  });

  it('aplica headers de segurança', async () => {
    app = await buildApp({ config, database: fakeDb, logger: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
