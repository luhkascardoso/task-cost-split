# 15 · Backend (Node.js)

O backend próprio do TaskCost Split é uma API **Node.js + TypeScript** na pasta `server/` deste repositório, com **PostgreSQL no Supabase**. A v1 entrega **paridade com o app**: tudo o que a fonte de dados `mock` faz hoje passa a existir no servidor, e o app troca de fonte sem mudar nenhuma tela ([04 · Camada de dados](04-camada-de-dados.md)).

> **Situação:** arquitetura definida (LUH-17); implementação por fases a partir do LUH-6. Até a fase 4, o app roda com o `mock`.

## Decisões

| Tema | Decisão | Registro |
|---|---|---|
| Onde | `server/` neste repositório, com `package.json` próprio | [ADR 0001](backend/adr/0001-server-no-mesmo-repositorio.md) |
| HTTP | Fastify 5 + Zod 4 (`@fastify/type-provider-zod`), OpenAPI gerado das rotas | [ADR 0002](backend/adr/0002-fastify-e-zod.md) |
| Banco | Postgres no Supabase (só como banco) + Prisma 7 | [ADR 0003](backend/adr/0003-prisma-e-postgres-no-supabase.md) |
| Regras | O servidor importa `src/domain` do app; nenhuma regra de dinheiro no `server/` | [ADR 0004](backend/adr/0004-dominio-compartilhado.md) |
| Auth | Própria: JWT de 15 min + refresh rotativo de 30 dias, argon2id | [ADR 0005](backend/adr/0005-autenticacao-propria.md) |
| Participantes | Híbrido: nome do dono, que **pode** ser vinculado a uma conta | [ADR 0006](backend/adr/0006-participante-hibrido.md) |
| Erros | `{ error: { code, message } }` com os códigos do contrato; `404` para recurso de outro usuário | [ADR 0007](backend/adr/0007-formato-de-erro.md) |
| Testes | Testes de API contra Postgres real, sem mock de banco | [ADR 0008](backend/adr/0008-testes-contra-postgres-real.md) |
| Duplicidade | `Idempotency-Key` nas criações | [ADR 0009](backend/adr/0009-idempotencia.md) |
| Deploy | Render (Docker) com migrations pelo GitHub Actions antes do código | [06 · Deploy](backend/06-deploy-e-operacao.md) |

Mudou uma decisão? Escreva um ADR novo que substitui o antigo ([como](backend/adr/README.md)).

## Visão geral

```
  App (Expo)                                  server/ (Fastify)                         Supabase
 ┌──────────────────────────┐   HTTPS + JWT   ┌──────────────────────────────────┐    ┌──────────────┐
 │ features → @/data        │ ──────────────▶ │ rotas (Zod: entrada e saída)      │    │ PostgreSQL   │
 │   src/data/http/         │                 │   ▼                               │    │ schema "app" │
 │   (adaptador DataSource) │ ◀────────────── │ serviços ── src/domain (do app)   │───▶│ (Prisma)     │
 │   tokens: expo-secure-   │  JSON / erros   │   ▼          splitEvenly, regras  │    └──────────────┘
 │   store                  │  com code       │ repositórios (escopo do dono)     │
 └──────────────────────────┘                 └──────────────────────────────────┘
```

## Documentação

| Doc | Leia quando |
|---|---|
| [01 · Arquitetura](backend/01-arquitetura.md) | For criar pasta, módulo, plugin ou mexer na composição; dúvida sobre o que pode importar o quê |
| [02 · API](backend/02-api.md) | For criar ou mudar rota, status, erro, limite de entrada ou compatibilidade com o app |
| [03 · Dados](backend/03-dados.md) | For mexer no schema, em consultas ou em migrations; dúvida sobre um termo do domínio |
| [04 · Autenticação e segurança](backend/04-autenticacao-e-seguranca.md) | For mexer em login, tokens, permissões, rate limit, CORS, segredos |
| [05 · Testes](backend/05-testes.md) | For escrever ou revisar teste do servidor (casos obrigatórios por rota) |
| [06 · Deploy e operação](backend/06-deploy-e-operacao.md) | For configurar ambiente, variáveis, imagem, pipeline, ou houver incidente |
| [ADRs](backend/adr/README.md) | Quiser saber **por que** algo é como é, ou for mudar uma decisão |

## Skills dos agentes

| Skill | Use para |
|---|---|
| [`backend-endpoint`](../.claude/skills/backend-endpoint/SKILL.md) | Criar ou mudar uma rota (contrato → schema → repositório → serviço → rota → testes → docs) |
| [`backend-migration`](../.claude/skills/backend-migration/SKILL.md) | Mudar o banco: tabela, coluna, índice, dado |
| [`code-review`](../.claude/skills/code-review/SKILL.md) | Revisão de PR; quando o diff toca o `server/`, aplica também [as regras de backend](../.claude/skills/code-review/backend.md) |

## Fases

| Fase | Card | Entrega |
|---|---|---|
| 0 · Arquitetura | LUH-17 | Estes docs, ADRs e skills |
| 1 · Fundação | LUH-6 | `server/`, Fastify, env, erros, `/health`, OpenAPI, Prisma com Postgres local, isolamento do app, job `server` no CI |
| 2 · Auth | LUH-7 | Cadastro (com "eu"), login, refresh rotativo, saída, `/v1/me`, rate limit |
| 3 · Recursos | LUH-8 | Atividades, despesas (com `src/domain`), status de cota, participantes, resumo, idempotência |
| 4 · Adaptador HTTP | LUH-9 | `src/data/http/` no app + suíte de contrato contra o servidor |
| 5 · Deploy | LUH-10 | Supabase (schema `app` + RLS), Render, pipeline de deploy, variáveis no EAS |
| 6 · Vínculo (v2) | — | Convite por e-mail, aceite, atividades compartilhadas e permissões de quem está vinculado; telas no app |
| 7 · Pagador e saldo (v2) | — | Quem pagou a despesa e "quem deve a quem" com quitação mínima |

## O que veio da referência e o que mudou

Inspirado na [Expense Split API (Swift)](https://github.com/rocketseat-education/swift-expense-split-api).

| Ponto | Referência (Swift + Vapor) | Aqui |
|---|---|---|
| Divisão | `amount / n` em inteiro: **perde centavos** (R$ 100,00 / 3 = 3 × R$ 33,33) | `splitEvenly` do app: o resto vai centavo a centavo para os primeiros; a soma fecha sempre |
| Participantes | Só contas de usuário | Híbrido: nome ou conta vinculada |
| Pagamento | Pagamentos por valor + alternância pendente/pago | Status por cota (contrato atual); pagamentos por valor na v2 se fizer sentido |
| Pagador e saldo | Sim | v2 (fase 7) |
| Auth | JWT + bcrypt | JWT curto + refresh rotativo, argon2id |
| Estrutura | Controllers, DTOs, migrations, OpenAPI, Docker, Render | Mesmas ideias, em Fastify + Prisma |
