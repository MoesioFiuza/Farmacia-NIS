import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { schemas, schemaFor, type Resource } from './resources.js';

const resources = Object.keys(schemas) as [Resource, ...Resource[]];
const operationSchema = z.object({
  operationId: z.string().uuid(),
  entityType: z.enum(resources),
  entityId: z.string().uuid(),
  action: z.enum(['create', 'update', 'delete']),
  baseVersion: z.number().int().nonnegative().optional(),
  data: z.record(z.string(), z.unknown()).default({})
});
const pushSchema = z.object({ operations: z.array(operationSchema).max(200) });
const pullSchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500)
});
const cursorSchema = z.object({ at: z.string().datetime({ offset: true }), type: z.string(), id: z.string() });

function decodeCursor(value?: string) {
  if (!value) return { at: '1970-01-01T00:00:00.000Z', type: '', id: '' };
  if (!Number.isNaN(Date.parse(value))) return { at: new Date(value).toISOString(), type: '', id: '' };
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  } catch {
    return null;
  }
}

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync/push', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = pushSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Lote de sincronização inválido', issues: parsed.error.issues });

    const results = await app.db.begin(async (tx) => {
      const output: Record<string, unknown>[] = [];
      for (const op of parsed.data.operations) {
        const [previous] = await tx`SELECT result FROM sync_operations
          WHERE tenant_id=${request.user.tenantId} AND operation_id=${op.operationId}`;
        if (previous) {
          output.push({ ...(previous.result as object), idempotent: true });
          continue;
        }

        const table = tx(op.entityType);
        let result: Record<string, unknown>;
        if (op.action === 'create') {
          const data = schemaFor(op.entityType).omit({ id: true }).safeParse(op.data);
          if (!data.success) {
            result = { operationId: op.operationId, status: 'invalid', issues: data.error.issues };
          } else {
            const row: Record<string, unknown> = { ...data.data, id: op.entityId, tenant_id: request.user.tenantId };
            const [created] = await tx`INSERT INTO ${table} ${(tx as any)(row, ...Object.keys(row))}
              ON CONFLICT (id) DO NOTHING RETURNING *`;
            result = created
              ? { operationId: op.operationId, status: 'applied', record: created }
              : { operationId: op.operationId, status: 'conflict', reason: 'id_exists' };
          }
        } else {
          const baseVersion = op.baseVersion;
          if (!baseVersion) {
            result = { operationId: op.operationId, status: 'invalid', reason: 'baseVersion_required' };
          } else if (op.action === 'delete') {
            const [deleted] = await tx`UPDATE ${table} SET deleted_at=now()
              WHERE id=${op.entityId} AND tenant_id=${request.user.tenantId}
                AND version=${baseVersion} AND deleted_at IS NULL RETURNING *`;
            result = deleted
              ? { operationId: op.operationId, status: 'applied', record: deleted }
              : { operationId: op.operationId, status: 'conflict', reason: 'version_mismatch' };
          } else {
            const data = schemaFor(op.entityType).partial().omit({ id: true }).safeParse(op.data);
            if (!data.success || !Object.keys(data.data ?? {}).length) {
              result = { operationId: op.operationId, status: 'invalid', issues: data.success ? [] : data.error.issues };
            } else {
              const changes = data.data;
              const [updated] = await tx`UPDATE ${table} SET ${tx(changes, ...Object.keys(changes))}
                WHERE id=${op.entityId} AND tenant_id=${request.user.tenantId}
                  AND version=${baseVersion} AND deleted_at IS NULL RETURNING *`;
              result = updated
                ? { operationId: op.operationId, status: 'applied', record: updated }
                : { operationId: op.operationId, status: 'conflict', reason: 'version_mismatch' };
            }
          }
        }

        await tx`INSERT INTO sync_operations (tenant_id, operation_id, entity_type, entity_id, result)
          VALUES (${request.user.tenantId}, ${op.operationId}, ${op.entityType}, ${op.entityId}, ${tx.json(result as never)})`;
        if (result.status === 'applied') {
          await tx`INSERT INTO audit_log (tenant_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (${request.user.tenantId}, ${request.user.sub}, ${op.entityType}, ${op.entityId},
              ${`sync_${op.action}`}, ${tx.json({ operationId: op.operationId })})`;
        }
        output.push(result);
      }
      return output;
    });
    return { results };
  });

  app.get('/sync/pull', { preHandler: app.authenticate }, async (request, reply) => {
    const query = pullSchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'Cursor inválido' });
    const cursor = decodeCursor(query.data.cursor);
    if (!cursor) return reply.code(400).send({ error: 'Cursor inválido' });
    const tenantId = request.user.tenantId;
    const rows = await app.db`
      WITH changes AS (
        SELECT 'patients' entity_type, id, updated_at, to_jsonb(p.*) record FROM patients p WHERE tenant_id=${tenantId}
        UNION ALL SELECT 'consultations', id, updated_at, to_jsonb(c.*) FROM consultations c WHERE tenant_id=${tenantId}
        UNION ALL SELECT 'medications', id, updated_at, to_jsonb(m.*) FROM medications m WHERE tenant_id=${tenantId}
        UNION ALL SELECT 'appointments', id, updated_at, to_jsonb(a.*) FROM appointments a WHERE tenant_id=${tenantId}
        UNION ALL SELECT 'adherence', id, updated_at, to_jsonb(ad.*) FROM adherence ad WHERE tenant_id=${tenantId}
      )
      SELECT entity_type, id, updated_at, record FROM changes
      WHERE (updated_at, entity_type, id::text) > (${cursor.at}, ${cursor.type}, ${cursor.id})
      ORDER BY updated_at, entity_type, id LIMIT ${query.data.limit + 1}
    `;
    const page = rows.slice(0, query.data.limit);
    const last = page.at(-1);
    const nextCursor = last
      ? Buffer.from(JSON.stringify({
          at: new Date(String(last.updated_at)).toISOString(), type: last.entity_type, id: String(last.id)
        })).toString('base64url')
      : query.data.cursor ?? Buffer.from(JSON.stringify(cursor)).toString('base64url');
    return {
      changes: page.map((row) => ({ entityType: row.entity_type, record: row.record })),
      cursor: nextCursor,
      hasMore: rows.length > query.data.limit
    };
  });
}
