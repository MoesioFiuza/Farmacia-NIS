import type { Database } from './db.js';
import type { Config } from './config.js';

export type Role = 'admin' | 'pharmacist';
export interface AuthUser {
  sub: string;
  tenantId: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    config: Config;
    authenticate: import('fastify').preHandlerHookHandler;
    requireAdmin: import('fastify').preHandlerHookHandler;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}
