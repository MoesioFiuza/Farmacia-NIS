import 'dotenv/config';
import argon2 from 'argon2';
import { createDatabase } from './db.js';

const databaseUrl = process.env.DATABASE_URL;
const tenantName = process.env.BOOTSTRAP_TENANT_NAME;
const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!databaseUrl || !tenantName || !adminEmail || !adminPassword) {
  throw new Error(
    'Defina DATABASE_URL, BOOTSTRAP_TENANT_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD',
  );
}

if (adminPassword.length < 12) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD deve ter pelo menos 12 caracteres');
}

const db = createDatabase(databaseUrl);

try {
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
  const result = await db.begin(async (tx) => {
    const [tenant] = await tx`
      INSERT INTO tenants (name)
      VALUES (${tenantName})
      RETURNING id, name
    `;
    const [user] = await tx`
      INSERT INTO users (tenant_id, email, password_hash, role)
      VALUES (${tenant!.id}, ${adminEmail}, ${passwordHash}, 'admin')
      RETURNING id, email, role
    `;
    return { tenant, user };
  });

  console.log(JSON.stringify({
    tenantId: result.tenant!.id,
    tenantName: result.tenant!.name,
    adminEmail: result.user!.email,
  }, null, 2));
} finally {
  await db.end();
}
