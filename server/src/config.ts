import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/nis'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-me-now'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  LOG_LEVEL: z.string().default('info')
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(`Configuração inválida: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  if (result.data.NODE_ENV === 'production' && result.data.JWT_SECRET.startsWith('development-')) {
    throw new Error('JWT_SECRET deve ser definido em produção');
  }
  return result.data;
}
