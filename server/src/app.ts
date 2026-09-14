import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { Config } from './config.js';
import { createDatabase, type Database } from './db.js';
import { authRoutes } from './routes/auth.js';
import { resourceRoutes } from './routes/resources.js';
import { syncRoutes } from './routes/sync.js';
import './types.js';

interface BuildOptions {
  config: Config;
  database?: Database;
  logger?: boolean;
}

export async function buildApp(options: BuildOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger === false ? false : {
      level: options.config.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode })
      }
    },
    trustProxy: options.config.TRUST_PROXY,
    bodyLimit: 1_048_576,
    requestIdHeader: 'x-request-id'
  });
  const db = options.database ?? createDatabase(options.config.DATABASE_URL);
  app.decorate('db', db);
  app.decorate('config', options.config);

  await app.register(helmet, { contentSecurityPolicy: false });
  const origins = options.config.CORS_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean);
  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || origins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  });
  await app.register(rateLimit, { global: false });
  await app.register(jwt, { secret: options.config.JWT_SECRET });

  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      await reply.code(401).send({ error: 'Token ausente ou inválido' });
    }
  });
  app.decorate('requireAdmin', async function (request, reply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'admin') await reply.code(403).send({ error: 'Acesso restrito a administradores' });
    } catch {
      if (!reply.sent) await reply.code(401).send({ error: 'Token ausente ou inválido' });
    }
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    try {
      await app.db`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  await app.register(async (api) => {
    await api.register(authRoutes);
    await api.register(syncRoutes);
    await api.register(resourceRoutes);
  }, { prefix: '/api/v1' });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: { name: error.name, message: error.message, code: error.code } }, 'request failed');
    if (error.code === '23514') return reply.code(409).send({ error: 'Restrição de dados violada' });
    if (error.code === '23505') return reply.code(409).send({ error: 'Registro duplicado' });
    if (error.code === '23503') return reply.code(409).send({ error: 'Referência inválida' });
    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500)
      .send({ error: error.statusCode && error.statusCode < 500 ? error.message : 'Erro interno' });
  });

  if (!options.database) app.addHook('onClose', async () => db.end());
  return app;
}
