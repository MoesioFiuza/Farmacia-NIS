import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';

const config = loadConfig();
const sql = createDatabase(config.DATABASE_URL);
const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

for (const name of (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()) {
  const applied = await sql`SELECT 1 FROM schema_migrations WHERE name = ${name}`;
  if (applied.length) continue;
  const source = await readFile(join(migrationsDir, name), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(source);
    await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
  });
  console.info(`Migração aplicada: ${name}`);
}

await sql.end();
