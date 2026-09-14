import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const uuid = z.string().uuid();
const date = z.string().date();
const dateTime = z.string().datetime({ offset: true });
const nullableText = z.string().max(10_000).nullable().optional();

export const schemas = {
  patients: z.object({
    id: uuid.optional(), name: z.string().min(1).max(200), birth_date: date.nullable().optional(),
    medical_record: z.string().max(100).nullable().optional(), phone: z.string().max(50).nullable().optional(),
    notes: nullableText
  }),
  consultations: z.object({
    id: uuid.optional(), patient_id: uuid, pharmacist_id: uuid.nullable().optional(),
    occurred_at: dateTime, summary: nullableText, clinical_notes: nullableText
  }),
  medications: z.object({
    id: uuid.optional(), patient_id: uuid.nullable().optional(), name: z.string().min(1).max(200),
    dosage: z.string().max(200).nullable().optional(), schedule: z.string().max(500).nullable().optional(),
    active: z.boolean().optional(), started_at: date.nullable().optional(), ended_at: date.nullable().optional()
  }),
  appointments: z.object({
    id: uuid.optional(), patient_id: uuid, assigned_user_id: uuid.nullable().optional(),
    scheduled_at: dateTime, status: z.enum(['scheduled', 'completed', 'cancelled', 'missed']).optional(),
    notes: nullableText
  }),
  adherence: z.object({
    id: uuid.optional(), patient_id: uuid, medication_id: uuid.nullable().optional(),
    recorded_at: dateTime, status: z.enum(['taken', 'missed', 'late', 'unknown']), notes: nullableText
  })
} as const;

export type Resource = keyof typeof schemas;
const resources = Object.keys(schemas) as Resource[];
export const schemaFor = (resource: Resource): z.ZodObject<any> =>
  schemas[resource] as z.ZodObject<any>;
const paramsSchema = z.object({ resource: z.enum(resources as [Resource, ...Resource[]]), id: uuid });
const listParamsSchema = z.object({ resource: z.enum(resources as [Resource, ...Resource[]]) });
const listQuerySchema = z.object({
  updatedSince: dateTime.optional(),
  includeDeleted: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

async function audit(
  sql: any, tenantId: string, actorId: string, resource: string,
  entityId: string, action: string, metadata: Record<string, unknown> = {}
) {
  await sql`INSERT INTO audit_log
    (tenant_id, actor_id, entity_type, entity_id, action, metadata)
    VALUES (${tenantId}, ${actorId}, ${resource}, ${entityId}, ${action}, ${sql.json(metadata as never)})`;
}

export async function resourceRoutes(app: FastifyInstance) {
  app.get('/:resource', { preHandler: app.authenticate }, async (request, reply) => {
    const params = listParamsSchema.safeParse(request.params);
    const query = listQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: 'Parâmetros inválidos' });
    const table = app.db(params.data.resource);
    const rows = await app.db`
      SELECT * FROM ${table}
      WHERE tenant_id = ${request.user.tenantId}
        ${query.data.includeDeleted ? app.db`` : app.db`AND deleted_at IS NULL`}
        ${query.data.updatedSince ? app.db`AND updated_at > ${query.data.updatedSince}` : app.db``}
      ORDER BY updated_at, id LIMIT ${query.data.limit} OFFSET ${query.data.offset}
    `;
    return { data: rows };
  });

  app.get('/:resource/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Parâmetros inválidos' });
    const [row] = await app.db`SELECT * FROM ${app.db(params.data.resource)}
      WHERE id = ${params.data.id} AND tenant_id = ${request.user.tenantId} AND deleted_at IS NULL`;
    return row ?? reply.code(404).send({ error: 'Registro não encontrado' });
  });

  app.post('/:resource', { preHandler: app.authenticate }, async (request, reply) => {
    const params = listParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Recurso inválido' });
    const parsed = schemaFor(params.data.resource).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos', issues: parsed.error.issues });
    const row: Record<string, unknown> = { ...parsed.data, tenant_id: request.user.tenantId };
    const created = await app.db.begin(async (tx) => {
      const [record] = await tx`INSERT INTO ${tx(params.data.resource)}
        ${(tx as any)(row, ...Object.keys(row))} RETURNING *`;
      await audit(tx, request.user.tenantId, request.user.sub, params.data.resource, String(record!.id), 'create');
      return record;
    });
    return reply.code(201).send(created);
  });

  app.patch('/:resource/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Parâmetros inválidos' });
    const bodySchema = schemaFor(params.data.resource).partial().omit({ id: true }).extend({
      version: z.number().int().positive()
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Dados inválidos', issues: parsed.error.issues });
    const { version: rawVersion, ...changes } = parsed.data as Record<string, unknown>;
    const version = rawVersion as number;
    if (!Object.keys(changes).length) return reply.code(400).send({ error: 'Nenhuma alteração' });
    const updated = await app.db.begin(async (tx) => {
      const [record] = await tx`UPDATE ${tx(params.data.resource)}
        SET ${tx(changes, ...Object.keys(changes))}
        WHERE id = ${params.data.id} AND tenant_id = ${request.user.tenantId}
          AND version = ${version} AND deleted_at IS NULL RETURNING *`;
      if (record) await audit(tx, request.user.tenantId, request.user.sub, params.data.resource, params.data.id,
        'update', { fields: Object.keys(changes) });
      return record;
    });
    if (!updated) return reply.code(409).send({ error: 'Conflito de versão ou registro inexistente' });
    return updated;
  });

  app.delete('/:resource/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = z.object({ version: z.number().int().positive() }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'Parâmetros inválidos' });
    const deleted = await app.db.begin(async (tx) => {
      const [record] = await tx`UPDATE ${tx(params.data.resource)} SET deleted_at = now()
        WHERE id = ${params.data.id} AND tenant_id = ${request.user.tenantId}
          AND version = ${body.data.version} AND deleted_at IS NULL
        RETURNING id, version, updated_at, deleted_at`;
      if (record) await audit(tx, request.user.tenantId, request.user.sub, params.data.resource, params.data.id, 'delete');
      return record;
    });
    if (!deleted) return reply.code(409).send({ error: 'Conflito de versão ou registro inexistente' });
    return deleted;
  });
}
