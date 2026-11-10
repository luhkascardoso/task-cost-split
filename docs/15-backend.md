# 15 · Backend (Node.js)

O backend próprio do TaskCost Split é uma API **Node.js + TypeScript** na pasta `server/` deste repositório, com **PostgreSQL no Supabase**. A v1 entrega **paridade com o app**: tudo o que a fonte de dados `mock` faz hoje passa a existir no servidor, e o app troca de fonte sem mudar nenhuma tela ([04 · Camada de dados](04-camada-de-dados.md)).

> **Situação:** desenho para revisão, antes da implementação. Inspirado na [Expense Split API (Swift)](https://github.com/rocketseat-education/swift-expense-split-api), com as diferenças explicadas em [Referência](#o-que-veio-da-referência-e-o-que-mudou).

## Decisões

| Tema | Decisão | Por quê |
|---|---|---|
| Linguagem | Node.js 22 + TypeScript | Mesmo ecossistema do app; o servidor importa `src/domain` (divisão, validação, resumo) sem duplicar regra de dinheiro |
| Framework HTTP | Fastify + Zod (`fastify-type-provider-zod`) | Validação e tipos a partir do mesmo schema; OpenAPI gerado automaticamente (`@fastify/swagger`) |
| Banco | PostgreSQL no **Supabase**, só como banco | Gratuito; autenticação continua no nosso backend |
| Acesso ao banco | Prisma (schema + migrations) | Schema legível para pessoas e agentes; migrations versionadas |
| Auth | JWT de acesso (15 min) + refresh token rotativo (30 dias) | Sessão longa no app sem token de acesso longo; refresh revogável |
| Participantes | **Híbrido**: um participante é um nome do usuário **e pode** estar vinculado a uma conta | Ninguém precisa de conta para entrar numa despesa; quem tem conta passa a ver as atividades de que participa |
| Escopo v1 | Paridade com o app | Pagador e saldo ("quem deve a quem") ficam para a v2 |
| Onde | `server/` neste repositório, `package.json` próprio | Mesmo CI, code review e board; um PR pode mudar app e API juntos |
| Deploy | Render (web service gratuito, Docker) | Mesmo caminho da referência; sem custo |

## Arquitetura

```
  App (Expo)                                  server/ (Fastify)                         Supabase
 ┌──────────────────────────┐   HTTPS + JWT   ┌──────────────────────────────────┐    ┌──────────────┐
 │ features → @/data        │ ──────────────▶ │ rotas (Zod: entrada e saída)      │    │ PostgreSQL   │
 │   src/data/http/         │                 │   ▼                               │    │ schema "app" │
 │   (adaptador DataSource) │ ◀────────────── │ serviços ── src/domain (do app)   │───▶│ (Prisma)     │
 │   tokens: expo-secure-   │  JSON / erros   │   ▼          splitEvenly, regras  │    └──────────────┘
 │   store                  │  com code       │ repositórios (Prisma)             │
 └──────────────────────────┘                 └──────────────────────────────────┘
```

- **Rotas** só validam entrada/saída e chamam serviços. **Serviços** aplicam as regras, usando `src/domain`. **Repositórios** falam com o banco. Mesma divisão de responsabilidades do app ([11 · SOLID](11-solid.md)).
- O servidor importa o domínio do app por caminho (`@domain/*` → `../src/domain/*`). O domínio é TypeScript puro, sem React nem Expo. **Mudou uma regra em `src/domain`? Ela vale no app e no servidor no mesmo PR.**

### Estrutura de pastas

```
server/
├── package.json            # dependências e scripts próprios
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.ts              # monta o Fastify (plugins + rotas); usado também nos testes
│   ├── server.ts           # sobe o servidor
│   ├── env.ts              # variáveis de ambiente validadas com Zod
│   ├── plugins/            # auth (JWT), erros, swagger, rate limit
│   └── modules/
│       ├── auth/           # routes.ts, service.ts, schemas.ts
│       ├── activities/
│       ├── expenses/
│       ├── participants/
│       └── summary/
├── test/                   # testes de API contra Postgres real
├── Dockerfile
└── docker-compose.yml      # Postgres local para desenvolvimento e testes
```

## Modelo de dados

Tabelas no schema **`app`** do Postgres (não no `public`; ver [Segurança](#segurança)).

```
users ─────────┐
  1            │ 1 (opcional, vínculo)
  │            ▼
  *  participants (owner_id, user_id?, is_self)
  │            │ *
  1            │
activities ─1──* expenses ─1──* expense_shares *──1 participants
  (owner_id)                (position, amount_cents, status)
```

| Tabela | Campos principais | Regras |
|---|---|---|
| `users` | `id`, `name`, `email` (único, sem diferenciar maiúsculas), `password_hash` | Hash com argon2id |
| `refresh_tokens` | `id`, `user_id`, `token_hash` (único), `expires_at`, `revoked_at`, `replaced_by_id` | Guarda só o hash; rotação a cada uso |
| `participants` | `id`, `owner_id`, `name`, `user_id` (nulo = só nome), `is_self` | Exatamente um `is_self` por dono; um mesmo `user_id` vinculado no máximo uma vez por dono |
| `activities` | `id`, `owner_id`, `title`, `date` (date), `created_at`, `updated_at` | |
| `expenses` | `id`, `activity_id` (cascade), `title`, `amount_cents` (> 0), `created_at`, `updated_at` | |
| `expense_shares` | `expense_id` (cascade), `participant_id`, `position`, `amount_cents`, `status` (`pending`/`paid`) | Chave (`expense_id`, `participant_id`). `position` guarda a ordem enviada pelo app: o centavo de resto vai para os primeiros |
| `idempotency_keys` | `user_id`, `key`, `request_hash`, `response`, `created_at` | Reenvio de criação devolve o mesmo resultado ([05 · Dinheiro e duplicidade](05-regras-de-negocio.md#dinheiro-e-duplicidade)); expira em 24 h |

Invariantes garantidos pelo serviço, numa transação, e cobertos por teste: a soma das cotas é igual ao valor da despesa; todo participante de uma despesa pertence ao dono da atividade; o cadastro cria o usuário e o participante "eu" juntos.

### Participante híbrido

- Todo participante pertence a um **dono** (`owner_id`): é a lista de contatos daquele usuário, como no app hoje.
- O participante "eu" de cada usuário tem `is_self = true` e `user_id` = o próprio usuário.
- Um participante **pode** ser vinculado a uma conta (`user_id`). Quando estiver, o dono daquela conta passa a ver as atividades em que o participante aparece em alguma despesa.
- `isSelf` na resposta é calculado **para quem pede**: o participante vinculado à conta de quem está logado vem com `isSelf: true`. Assim o "Você" do app funciona também em atividades de outras pessoas.

**Na v1 o modelo já existe, mas não há fluxo de vínculo**: nenhum participante novo é vinculado, então o comportamento é idêntico ao do app hoje. O fluxo de vínculo (convite por e-mail aceito pela outra pessoa) é a fase 6, porque também pede telas no app.

## API

Base: `/v1`. JSON em UTF-8. Valores sempre em **centavos** e datas de atividade em `YYYY-MM-DD`. Documentação interativa em `/docs` e especificação em `/openapi.json`.

| Contrato do app (`DataSource`) | Rota | Resposta |
|---|---|---|
| `auth.signUp` | `POST /v1/auth/sign-up` `{ name, email, password }` | `201` `{ user, accessToken, refreshToken }` |
| `auth.signIn` | `POST /v1/auth/sign-in` `{ email, password }` | `200` idem |
| (renovação de sessão) | `POST /v1/auth/refresh` `{ refreshToken }` | `200` novo par de tokens; o anterior é revogado |
| `auth.signOut` | `POST /v1/auth/sign-out` `{ refreshToken }` | `204` |
| `auth.getSession` (validação) | `GET /v1/me` | `200` `User` |
| `activities.list` | `GET /v1/activities` | `200` `ActivityListItem[]`, data desc |
| `activities.get` | `GET /v1/activities/:id` | `200` `Activity` |
| `activities.create` | `POST /v1/activities` `{ title, date }` + `Idempotency-Key` | `201` `Activity` |
| `activities.update` | `PUT /v1/activities/:id` `{ title, date }` | `200` `Activity` |
| `activities.remove` | `DELETE /v1/activities/:id` | `204` (remove as despesas) |
| `expenses.listByActivity` | `GET /v1/activities/:id/expenses` | `200` `Expense[]`, criação asc |
| `expenses.create` | `POST /v1/activities/:id/expenses` `{ title, amount, participantIds }` + `Idempotency-Key` | `201` `Expense` (cotas calculadas no servidor) |
| `expenses.get` | `GET /v1/expenses/:id` | `200` `Expense` |
| `expenses.update` | `PUT /v1/expenses/:id` `{ title, amount, participantIds }` | `200` `Expense`, preservando o status de quem continua |
| `expenses.setShareStatus` | `PUT /v1/expenses/:id/shares/:participantId` `{ status }` | `200` `Expense`. `PUT` é idempotente: repetir não muda o resultado |
| `expenses.remove` | `DELETE /v1/expenses/:id` | `204` |
| `participants.list` | `GET /v1/participants` | `200` `ParticipantListItem[]`, nome (pt-BR) |
| `participants.create` | `POST /v1/participants` `{ name }` | `201` `Participant` |
| `summary.get` | `GET /v1/summary` | `200` `Summary` |
| — | `GET /health` | `200` (para o Render) |

**Quem pode o quê (v1):** só o dono lê e altera os próprios dados. Recurso de outro usuário responde **`404`**, não `403`, para não revelar que existe. Com o vínculo (fase 6): quem está vinculado **lê** a atividade e **marca a própria cota**; editar e excluir continuam com o dono.

### Erros

Todo erro tem o mesmo formato, com a mensagem já pronta para a tela (o app mostra com `errorMessage`):

```json
{ "error": { "code": "not_found", "message": "Despesa não encontrada" } }
```

| `code` ([04 · Erros](04-camada-de-dados.md#erros)) | HTTP | Exemplo |
|---|---|---|
| `invalid` | 400 | Valor zerado, participante inválido, data fora do formato |
| `unauthorized` | 401 | Token ausente/expirado, credencial inválida |
| `not_found` | 404 | Recurso inexistente ou de outro usuário |
| `conflict` | 409 | E-mail já cadastrado; mesma `Idempotency-Key` com corpo diferente |
| `server` | 500/503 | Erro inesperado (detalhe só no log, nunca na resposta) |

O app converte a falta de conexão em `network` e o tempo esgotado em `timeout`; o servidor não envia esses códigos.

## Autenticação

1. **Cadastro e login** devolvem `accessToken` (JWT HS256, 15 min, só com o id do usuário) e `refreshToken` (aleatório, 30 dias).
2. O app guarda os dois no **`expo-secure-store`** e manda `Authorization: Bearer <accessToken>`.
3. Com `401`, o app chama `/v1/auth/refresh` **uma vez** e repete a requisição. Se o refresh falhar, a sessão acaba e o app volta ao login.
4. **Rotação:** cada refresh revoga o token usado e emite outro. Se um token já revogado for usado de novo (indício de vazamento), toda a família daquela sessão é revogada.
5. **Saída:** `sign-out` revoga o refresh token; o app apaga os dois tokens e limpa o cache (`queryClient.clear()`, como hoje).

## No app: adaptador HTTP

`src/data/http/http-data-source.ts` implementa `DataSource` com `fetch`, seguindo os passos já previstos em [04](04-camada-de-dados.md#plugando-o-backend-quando-for-a-hora):

- URL base em `EXPO_PUBLIC_API_URL`; ativação com `EXPO_PUBLIC_DATA_SOURCE=http` em `src/data/index.ts`.
- Dependências injetadas (URL, `fetch`, armazenamento de tokens), como no mock.
- Respostas validadas com Zod; resposta fora do contrato vira `DataError` (`unknown`).
- Erros mapeados para `DataError` com o `code` da resposta; falta de rede → `network`, timeout → `timeout`.
- Criações enviam `Idempotency-Key` gerada no app.

**Teste de aceitação:** a suíte de contrato que o mock já passa (`runDataSourceContract`) roda contra o adaptador HTTP falando com o servidor de verdade, num Postgres de teste. Se ela passar, o app funciona com o backend sem mudar nenhuma tela.

## Segurança

| Risco | Mitigação |
|---|---|
| **Supabase expõe o schema `public` por uma API REST automática** (com a chave anônima do projeto) | Tabelas no schema **`app`**, que não é exposto; RLS ligado em todas as tabelas, sem políticas, como segunda barreira. O backend conecta como o usuário do banco, não pela API do Supabase |
| Senha vazada do banco | Senhas com argon2id; nunca em log |
| Força bruta no login | Limite de tentativas por IP e por e-mail (`@fastify/rate-limit`) e mensagem única para e-mail ou senha errados |
| Token roubado | Acesso curto (15 min); refresh com rotação e detecção de reuso; tokens no `expo-secure-store` |
| Dados de outro usuário | Todo acesso filtra pelo usuário do token; `404` para o que não é dele; teste "isola os dados de cada usuário" da suíte de contrato |
| Dados pessoais em log | Log estruturado (pino) com `authorization`, `password` e tokens mascarados |
| Segredos no repositório | Só `.env.example`; segredos nas variáveis do Render e do GitHub Actions |

## Testes

| Nível | O quê | Onde |
|---|---|---|
| Domínio | Regras de dinheiro (já existem) | `src/domain/__tests__` (Jest) |
| API | Cada rota: sucesso, validação, `401`, `404` de outro usuário, idempotência, rotação de refresh | `server/test` (Vitest + Postgres real via Docker) |
| Contrato | `runDataSourceContract('http', …)` contra o servidor | `server/test/contract.test.ts` |
| CI | Novo job `server` no CI: typecheck, lint, migrations e testes com Postgres como serviço | `.github/workflows/ci.yml` |

## Deploy

| Peça | Onde | Configuração |
|---|---|---|
| API | Render, web service gratuito via `server/Dockerfile` | Variáveis: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV` |
| Banco | Supabase (Postgres) | `DATABASE_URL` pelo pooler (porta 6543, `?pgbouncer=true`) para a API; `DIRECT_URL` (5432) para migrations |
| Migrations | `prisma migrate deploy` antes de subir a versão nova | Comando de pré-deploy no Render |
| App | EAS: `EXPO_PUBLIC_DATA_SOURCE=http` e `EXPO_PUBLIC_API_URL` por perfil de build | `development` pode seguir com `mock` |

**Limitação do plano gratuito do Render:** o serviço dorme após um período sem uso e a primeira requisição depois disso demora alguns segundos. O retry de leitura do app (falhas transitórias) cobre parte disso; para uso real, um plano pago ou outro host resolvem.

## Fases (cada uma vira card no LUH)

1. **Fundação:** `server/`, Fastify, env, formato de erro, `/health`, OpenAPI, Prisma com Postgres local, job `server` no CI.
2. **Auth:** cadastro (com participante "eu"), login, refresh com rotação, saída, `/v1/me`, rate limit.
3. **Recursos:** atividades, despesas (com `src/domain`), status de cota, participantes, resumo, idempotência.
4. **Adaptador HTTP no app** + suíte de contrato contra o servidor.
5. **Deploy:** Supabase (schema `app` + RLS), Render, variáveis no EAS.
6. **v2 · Vínculo de participantes:** convite por e-mail, aceite, atividades compartilhadas e permissões de quem está vinculado; telas no app.
7. **v2 · Pagador e saldo:** quem pagou a despesa e "quem deve a quem" com quitação mínima.

## O que veio da referência e o que mudou

| Ponto | Referência (Swift + Vapor) | Aqui |
|---|---|---|
| Divisão | `amount / n` em inteiro: **perde centavos** (R$ 100,00 / 3 = 3 × R$ 33,33) | `splitEvenly` do app: o resto vai centavo a centavo para os primeiros; a soma fecha sempre |
| Participantes | Só contas de usuário | Híbrido: nome ou conta vinculada |
| Pagamento | Pagamentos por valor + alternância pendente/pago | Status por cota (contrato atual); pagamentos por valor na v2 se fizer sentido |
| Pagador e saldo | Sim | v2 (fase 7) |
| Auth | JWT + bcrypt | JWT curto + refresh rotativo, argon2id |
| Estrutura | Controllers, DTOs, migrations, OpenAPI, Docker, Render | Mesmas ideias, em Fastify + Prisma |
