# Farmácia Clínica — Estácio FMJ

Aplicação web progressiva para acompanhamento farmacêutico. O frontend continua
operando durante quedas de conexão e envia alterações pendentes ao servidor
quando a internet retorna.

## Funcionalidades

- prontuário e consulta farmacêutica;
- plano de medicamentos com pictogramas e leitura em voz;
- agenda de retornos e acompanhamento de adesão;
- autenticação da equipe, sincronização e auditoria no servidor.

## Desenvolvimento do frontend

Requer Node.js 22 ou posterior.

```bash
cp .env.example .env
npm install
npm run dev
```

Por padrão, o login é obrigatório e a API local deve estar em execução. Para
desativá-lo somente durante o desenvolvimento, defina `VITE_REQUIRE_AUTH=false`.

## Validação

```bash
npm run lint
npm run build
```

## Produção

O `Dockerfile` gera uma imagem Nginx com a PWA e encaminha `/api` ao serviço da
API. Consulte `server/README.md` para configurar banco, primeiro administrador
e migrations.

Para subir a pilha completa:

```bash
cp .env.production.example .env
# substitua todas as senhas e configure o domínio HTTPS
docker compose up -d --build
```

Na primeira instalação, crie a clínica e o administrador:

```bash
docker compose run --rm \
  -e BOOTSTRAP_TENANT_NAME="Farmácia Escola" \
  -e BOOTSTRAP_ADMIN_EMAIL="admin@exemplo.edu.br" \
  -e BOOTSTRAP_ADMIN_PASSWORD="uma-senha-forte-e-unica" \
  migrate node dist/src/bootstrap.js
```

Depois da inicialização, entre apenas com o e-mail e a senha informados no
comando. Faça a inicialização apenas uma vez.

Este projeto é uma base técnica, não uma declaração de conformidade legal ou
clínica. Leia `SECURITY.md` antes de utilizar dados reais.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
