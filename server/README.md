# NIS Clinic API

Backend Node.js/TypeScript para o PWA clínico. Usa Fastify, PostgreSQL (`postgres`),
JWT, Argon2id e Zod. Todos os dados clínicos são isolados por `tenant_id`.

## Executar

Requisitos: Node 20+ e PostgreSQL 14+.

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Em produção, defina um `JWT_SECRET` aleatório forte, restrinja `CORS_ORIGINS`
(lista separada por vírgulas), use TLS no proxy e no PostgreSQL e execute.
Ative `TRUST_PROXY=true` somente quando a API estiver atrás de proxy confiável:

```bash
npm ci
npm run build
npm run migrate
npm start
```

O container executa como usuário sem privilégios:

```bash
docker build -t nis-clinic-api .
docker run --env-file .env -p 3001:3001 nis-clinic-api
```

As migrações têm controle em `schema_migrations`. Faça backup antes de migrar.
O primeiro tenant e administrador devem ser provisionados uma vez:

```bash
BOOTSTRAP_TENANT_NAME="Farmácia Escola" \
BOOTSTRAP_ADMIN_EMAIL="admin@exemplo.edu.br" \
BOOTSTRAP_ADMIN_PASSWORD="uma-senha-forte-e-unica" \
npm run bootstrap
```

O login utiliza somente e-mail e senha. Administradores podem listar e criar
usuários pela área administrativa ou pelas rotas `GET/POST /api/v1/auth/users`.

## Rotas

- `POST /api/v1/auth/login`, `/auth/refresh`, `/auth/logout`
- `GET /api/v1/auth/me`; `GET/POST /api/v1/auth/users` (admin)
- CRUD em `/api/v1/patients`, `/consultations`, `/medications`,
  `/appointments` e `/adherence`
- `POST /api/v1/sync/push` e `GET /api/v1/sync/pull?cursor=<cursor-opaco>`
- `GET /health` (processo) e `GET /ready` (PostgreSQL)

PATCH e DELETE exigem `version`; divergência retorna HTTP 409. DELETE é lógico.
O banco incrementa `version` e `updated_at`. Escritas geram auditoria
append-only.

No sync, cada operação contém:

```json
{
  "operationId": "uuid-idempotente",
  "entityType": "patients",
  "entityId": "uuid-do-registro",
  "action": "update",
  "baseVersion": 2,
  "data": { "name": "Novo nome" }
}
```

Reenvios de `operationId` retornam o resultado já persistido. Conflitos não
sobrescrevem dados do servidor. O cliente deve aplicar o pull, resolver o
conflito com a equipe e reenviar com a nova versão.
No primeiro pull, omita `cursor` (um ISO-8601 legado também é aceito); depois,
persista e reenvie exatamente o cursor opaco retornado pela API.

## Segurança e operação

- Access tokens curtos; refresh tokens aleatórios são armazenados somente como
  SHA-256 e rotacionados a cada uso.
- Senhas usam Argon2id e hashes nunca são retornados.
- Login limitado a cinco tentativas por minuto por origem.
- Logs incluem metadados operacionais, não corpos, tokens ou dados clínicos.
- Headers de segurança e CORS configurável estão habilitados.
- RBAC diferencia `admin` e `pharmacist`; ambos acessam recursos do próprio
  tenant, somente admin gerencia usuários.

Esta implementação fornece controles técnicos, mas **não implica conformidade
automática com a LGPD**. Avalie base legal, minimização, retenção, direitos dos
titulares, contratos, resposta a incidentes, criptografia/gestão de chaves,
backups e controles organizacionais com responsáveis jurídicos e de segurança.

## Validação

```bash
npm run typecheck
npm test
npm run build
```
