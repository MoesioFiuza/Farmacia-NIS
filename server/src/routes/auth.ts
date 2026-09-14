import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(200)
});
const refreshSchema = z.object({ refreshToken: z.string().min(40) });
const userSchema = loginSchema.extend({
  role: z.enum(['admin', 'pharmacist']).default('pharmacist')
});

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function issueRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dados de login inválidos' });

    const users = await app.db`
      SELECT id, tenant_id, email, password_hash, role
      FROM users
      WHERE email = ${parsed.data.email}
        AND active = true AND deleted_at IS NULL
      LIMIT 2
    `;
    const user = users.length === 1 ? users[0] : undefined;
    if (!user || !(await argon2.verify(String(user.password_hash), parsed.data.password))) {
      return reply.code(401).send({ error: 'Credenciais inválidas' });
    }

    const payload = { sub: String(user.id), tenantId: String(user.tenant_id), role: user.role };
    const accessToken = app.jwt.sign(payload, { expiresIn: app.config.ACCESS_TOKEN_TTL });
    const refreshToken = issueRefreshToken();
    const expiresAt = new Date(Date.now() + app.config.REFRESH_TOKEN_DAYS * 86_400_000);
    await app.db`
      INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
      VALUES (${user.id}, ${user.tenant_id}, ${hashToken(refreshToken)}, ${expiresAt})
    `;
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Token inválido' });
    const tokenHash = hashToken(parsed.data.refreshToken);

    const result = await app.db.begin(async (tx) => {
      const [stored] = await tx`
        SELECT rt.id, u.id AS user_id, u.tenant_id, u.role
        FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = ${tokenHash} AND rt.revoked_at IS NULL
          AND rt.expires_at > now() AND u.active = true AND u.deleted_at IS NULL
        FOR UPDATE
      `;
      if (!stored) return null;
      await tx`UPDATE refresh_tokens SET revoked_at = now() WHERE id = ${stored.id}`;
      const nextToken = issueRefreshToken();
      const expiresAt = new Date(Date.now() + app.config.REFRESH_TOKEN_DAYS * 86_400_000);
      await tx`
        INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
        VALUES (${stored.user_id}, ${stored.tenant_id}, ${hashToken(nextToken)}, ${expiresAt})
      `;
      return {
        accessToken: app.jwt.sign(
          { sub: String(stored.user_id), tenantId: String(stored.tenant_id), role: stored.role },
          { expiresIn: app.config.ACCESS_TOKEN_TTL }
        ),
        refreshToken: nextToken
      };
    });
    if (!result) return reply.code(401).send({ error: 'Refresh token inválido ou expirado' });
    return result;
  });

  app.post('/auth/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(204).send();
    await app.db`UPDATE refresh_tokens SET revoked_at = now()
      WHERE token_hash = ${hashToken(parsed.data.refreshToken)} AND revoked_at IS NULL`;
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    const [user] = await app.db`
      SELECT id, email, email AS name, role, tenant_id, created_at, updated_at, version
      FROM users WHERE id = ${request.user.sub} AND tenant_id = ${request.user.tenantId}
    `;
    return user;
  });

  app.get('/auth/users', { preHandler: app.requireAdmin }, async (request) => {
    return app.db`
      SELECT id, email, role, active, created_at
      FROM users
      WHERE tenant_id = ${request.user.tenantId} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
  });

  app.post('/auth/users', { preHandler: app.requireAdmin }, async (request, reply) => {
    const parsed = userSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Usuário inválido' });
    const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
    const user = await app.db.begin(async (tx) => {
      const [created] = await tx`
        INSERT INTO users (tenant_id, email, password_hash, role)
        VALUES (${request.user.tenantId}, ${parsed.data.email}, ${passwordHash}, ${parsed.data.role})
        RETURNING id, tenant_id, email, role, active, created_at, updated_at, version
      `;
      await tx`INSERT INTO audit_log (tenant_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (${request.user.tenantId}, ${request.user.sub}, 'users', ${created!.id}, 'create', '{}'::jsonb)`;
      return created;
    });
    return reply.code(201).send(user);
  });
}
