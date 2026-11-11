# Backend · 01 · Arquitetura

Como o `server/` é organizado e por quê. Índice e decisões em [15 · Backend](../15-backend.md).

## Princípios

| Princípio | Na prática |
|---|---|
| **Domínio único** | Regra de dinheiro, divisão, status e resumo existe só em `src/domain`. O servidor importa; nunca reescreve ([ADR 0004](adr/0004-dominio-compartilhado.md)) |
| **Escopo do dono** | Toda leitura e escrita filtra pelo usuário do token. Recurso de outro usuário não existe para quem pede: `404` ([03 · Dados](03-dados.md#escopo-do-dono)) |
| **Contrato primeiro** | A API espelha o `DataSource` do app. Rota nova começa no contrato e na tabela de rotas ([02 · API](02-api.md)) |
| **Rota fina** | A rota valida e delega. Regra fica no serviço; banco fica no repositório |
| **Falha visível** | Todo erro sai no formato `{ error: { code, message } }`, com mensagem pronta para a tela. Detalhe técnico só no log |
| **Dependência injetada** | Banco, relógio e gerador de ids entram por parâmetro: o teste troca sem mock de módulo ([11 · SOLID](../11-solid.md#d--inversão-de-dependência)) |

## Camadas

```
requisição ─▶ plugins (auth, erros, rate limit) ─▶ rota ─▶ serviço ─▶ repositório ─▶ Postgres
                                                     │         │
                                                schemas Zod   src/domain (regras puras)
```

| Camada | Arquivo | Faz | Pode importar | Não faz |
|---|---|---|---|---|
| Plugin | `src/plugins/*.ts` | Autenticação, mapeamento de erros, rate limit, Swagger, request id | Fastify, `src/errors.ts`, `env` | Regra de negócio |
| Rota | `modules/<recurso>/routes.ts` | Declara método, URL, schemas, `preHandler` de auth e status; chama um método do serviço | schemas, serviço | `try/catch`, Prisma, cálculo |
| Schema | `modules/<recurso>/schemas.ts` | Zod de params, query, corpo e **resposta** | `zod`, tipos de `@/domain` | Lógica |
| Serviço | `modules/<recurso>/service.ts` | Regras e orquestração: valida com `@/domain`, abre transação, chama repositórios, lança `AppError` | repositórios, `@/domain`, `src/errors.ts` | SQL, Fastify, `request`/`reply` |
| Repositório | `modules/<recurso>/repository.ts` | Consultas Prisma, sempre com o `ownerId`; converte linha do banco em modelo de domínio | Prisma Client gerado | Regra de negócio, `AppError` de negócio |
| Domínio | `../src/domain` (do app) | `splitEvenly`, `buildShares`, `getExpenseStatus`, `getSummary`, validação | nada de fora do domínio | IO de qualquer tipo |

Um módulo (`activities`, `expenses`…) só importa outro módulo pelo **serviço** dele, nunca pelo repositório. Isso mantém a regra de cada recurso num lugar só.

## Fluxo de uma requisição

1. O plugin de request id lê ou gera `x-request-id` e o devolve na resposta. Todo log da requisição leva esse id.
2. O rate limit corta o abuso antes de qualquer trabalho.
3. O `preHandler` `app.authenticate` valida o JWT e põe `request.userId`. Rota pública declara isso explicitamente (só auth e `/health`).
4. O type provider valida params, query e corpo com o Zod da rota. Falha vira `400 invalid`.
5. A rota chama o serviço com `request.userId` e os dados já tipados.
6. O serviço aplica as regras (usando `@/domain`) e chama os repositórios, numa transação quando grava mais de uma tabela.
7. O retorno passa pelo schema de **resposta**: campo que não está no schema não sai (protege contra vazar `password_hash`, `owner_id` etc.).
8. Erro em qualquer ponto chega ao plugin de erros, que responde no formato do contrato ([02 · Erros](02-api.md#erros)).

## Estrutura de pastas

```
server/
├── package.json             # scripts e dependências próprios (ESM, "type": "module")
├── tsconfig.json            # strict; paths @/domain e @/lib/errors → ../src
├── eslint.config.js         # inclui a regra de imports permitidos (abaixo)
├── vitest.config.ts
├── prisma.config.ts         # schema, migrations e DIRECT_URL (só para a CLI)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts              # dados de desenvolvimento
├── src/
│   ├── server.ts            # lê env, monta o app, listen; trata SIGTERM
│   ├── app.ts               # buildApp(deps): plugins + módulos; usado também nos testes
│   ├── env.ts               # variáveis validadas com Zod; o app não sobe com env inválida
│   ├── errors.ts            # AppError e os códigos do contrato
│   ├── db.ts                # cria o Prisma Client com o driver adapter (DATABASE_URL)
│   ├── generated/           # Prisma Client gerado (fora do git)
│   ├── plugins/             # auth, errors, request-id, rate-limit, swagger
│   └── modules/
│       ├── auth/            # routes.ts, schemas.ts, service.ts, repository.ts, tokens.ts
│       ├── activities/
│       ├── expenses/
│       ├── participants/
│       ├── summary/
│       └── idempotency/     # hook das rotas de criação
├── test/
│   ├── helpers.ts           # buildTestApp, signUpUser, auth header, limpeza do banco
│   ├── <recurso>.test.ts    # testes de API por recurso
│   └── contract.test.ts     # suíte de contrato do app contra o servidor (fase 4)
├── Dockerfile               # contexto de build = raiz do repositório
└── docker-compose.yml       # Postgres local (dev e testes)
```

Nomes de arquivo em `kebab-case`, exports nomeados, ESM. Um arquivo por papel dentro do módulo; se um serviço passar de ~300 linhas, divida por caso de uso (`expenses/create.ts`, `expenses/update.ts`).

## Composição e injeção de dependência

`buildApp` recebe tudo o que tem efeito fora do processo e é a única função que liga as peças:

```ts
// src/app.ts (esboço)
export interface AppDeps {
  env: Env;
  prisma: PrismaClient;
  clock: () => Date;          // testes congelam o tempo (expiração de token, idempotência)
  newId: () => string;        // ids previsíveis em teste, se preciso
}

export async function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: loggerOptions(deps.env), genReqId: requestId });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(errorsPlugin).register(authPlugin, deps).register(rateLimitPlugin, deps);
  await app.register(activitiesModule, { prefix: '/v1', ...deps });
  // … demais módulos
  return app;
}
```

Cada módulo monta o próprio serviço com fábricas (`createActivitiesService({ prisma, clock })`), sem singletons nem `import prisma from '../db'` espalhado. O teste chama `buildApp` com o Prisma do banco de teste e um relógio fixo, e usa `app.inject()` sem abrir porta ([05 · Testes](05-testes.md)).

## Domínio compartilhado

O servidor importa **só** isto do app:

| Import | Aponta para | Para quê |
|---|---|---|
| `@/domain` | `../src/domain` | Tipos (`Activity`, `Expense`, `Cents`…), divisão, status, resumo, validação |
| `@/lib/errors` | `../src/lib/errors.ts` | `DataErrorCode` (os códigos do contrato) e `DEFAULT_ERROR_MESSAGES` |

Os dois são TypeScript puro, sem React, Expo ou IO. Para continuar assim:

- **Allowlist de imports no `server/`:** o ESLint do servidor (`no-restricted-imports`) bloqueia `@/data`, `@/features`, `@/components`, `@/app`, `react*` e `expo*`. Qualquer outro caminho de `../src` é recusado.
- **Ida e volta:** o app nunca importa de `server/`. O lint do app bloqueia `server/*`.
- **Mudou `src/domain`?** Vale no app e no servidor no mesmo PR; os testes dos dois rodam no CI.
- **Build:** o `tsup` empacota `src/server.ts` em `dist/server.js` **com o domínio embutido** (os paths não existem em tempo de execução). Por isso o `Dockerfile` usa a raiz do repositório como contexto ([06 · Deploy](06-deploy-e-operacao.md#build-e-imagem)). Em desenvolvimento, `tsx watch` resolve os paths direto.

## Isolamento entre app e servidor

O app e o servidor têm `package.json`, `tsconfig`, lint e testes próprios. A fase 1 precisa ajustar a raiz, senão as ferramentas do app tentam processar o `server/`:

| Ferramenta do app | Ajuste |
|---|---|
| `tsconfig.json` (inclui `**/*.ts`) | `"exclude": ["server"]` |
| `eslint.config.js` | `ignores: ['dist/*', 'server/**']` |
| Jest (`package.json`) | `"/server/"` em `testPathIgnorePatterns` |
| Metro | Nada: o bundle só segue imports a partir das rotas do app |
| CI | Job `server` separado, que roda só quando muda `server/**`, `src/domain/**` ou `src/lib/errors.ts` |

## Configuração

`src/env.ts` valida `process.env` com Zod na subida; variável faltando ou inválida derruba o processo com a lista do que falta, antes de aceitar tráfego. O resto do código recebe `env` por parâmetro e nunca lê `process.env`. Lista das variáveis em [06 · Variáveis de ambiente](06-deploy-e-operacao.md#variáveis-de-ambiente).

## Logs

- Logger do Fastify (pino), JSON em produção e legível em desenvolvimento.
- `redact` cobre `req.headers.authorization`, `password`, `refreshToken`, `accessToken` e `*.password_hash`. Corpo de requisição não é logado.
- Um log por requisição (método, rota, status, tempo, `requestId`, `userId` quando houver). Erro `500` loga o stack; a resposta não.

## Versões e documentação das bibliotecas

Fastify 5, `@fastify/type-provider-zod`, Zod 4, Prisma 7 (com `prisma.config.ts` e `@prisma/adapter-pg`), Vitest. Essas APIs mudam entre versões maiores: antes de usar uma API delas, consulte a documentação **da versão do `server/package.json`** (Context7 ou o site oficial), do mesmo jeito que o [AGENTS.md](../../AGENTS.md) manda fazer com o Expo.
