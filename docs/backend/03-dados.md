# Backend · 03 · Dados

Glossário, modelo, regras de acesso e migrations. Regras de negócio em [05 · Regras de negócio](../05-regras-de-negocio.md); decisão do banco em [ADR 0003](adr/0003-prisma-e-postgres-no-supabase.md).

## Glossário

Um termo, um nome em cada camada. Use estes nomes em código, rotas, tabelas, testes e conversa com agentes.

| Termo (tela) | Código | Tabela | Significado |
|---|---|---|---|
| Usuário | `User` | `users` | Quem tem conta e faz login |
| Dono | `ownerId` | `owner_id` | O usuário a quem um registro pertence. Base do **escopo do dono** |
| Participante | `Participant` | `participants` | Um nome na lista do dono. Pode estar **vinculado** a uma conta (`userId`) |
| Você / "eu" | `isSelf` | `is_self` | O participante que representa o próprio dono. Um por usuário, criado no cadastro |
| Vínculo | `participant.userId` | `user_id` | Participante ligado a uma conta (fase 6). Na v1 só o "eu" é vinculado |
| Atividade | `Activity` | `activities` | Agrupa despesas (viagem, jantar). Tem título e data |
| Despesa | `Expense` | `expenses` | Um gasto de uma atividade, com valor em centavos |
| Cota | `ExpenseShare` | `expense_shares` | A parte de um participante numa despesa, com status |
| Status da cota | `ShareStatus` | `status` | `pending` (Pendente) ou `paid` (Pago) |
| Status da despesa | `ExpenseStatus` | — | **Derivado** das cotas (`getExpenseStatus`); nunca gravado |
| Resumo | `Summary` | — | Calculado na hora (`getSummary`); nunca gravado |

## Modelo

Todas as tabelas ficam no schema **`app`** do Postgres, não no `public` ([04 · Supabase](04-autenticacao-e-seguranca.md#supabase)).

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

| Tabela | Colunas | Restrições e índices |
|---|---|---|
| `users` | `id`, `name`, `email`, `password_hash`, `created_at` | `email` único (gravado em minúsculas) |
| `refresh_tokens` | `id`, `user_id`, `family_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by_id`, `created_at` | `token_hash` único; índice em `user_id` e `family_id` |
| `participants` | `id`, `owner_id`, `name`, `user_id` (nulo = só nome), `is_self`, `created_at` | Índice em `owner_id`; único parcial `(owner_id) WHERE is_self`; único `(owner_id, user_id)` |
| `activities` | `id`, `owner_id`, `title`, `date` (`date`), `created_at`, `updated_at` | Índice `(owner_id, date DESC)` |
| `expenses` | `id`, `activity_id` (cascade), `title`, `amount_cents`, `created_at`, `updated_at` | `CHECK (amount_cents > 0)`; índice `(activity_id, created_at)` |
| `expense_shares` | `expense_id` (cascade), `participant_id` (restrict), `position`, `amount_cents`, `status` | PK `(expense_id, participant_id)`; `CHECK (amount_cents >= 0)`; índice em `participant_id` |
| `idempotency_keys` | `user_id`, `key`, `request_hash`, `response_status`, `response_body` (jsonb), `created_at` | PK `(user_id, key)`; índice em `created_at` (limpeza) |

`position` guarda a ordem dos `participantIds` enviada pelo app: o centavo de resto vai para os primeiros, e a ordem das cotas na resposta é por `position`.

### Invariantes

Garantidos pelo serviço, dentro de uma transação, e cobertos por teste de API:

1. A soma das `amount_cents` das cotas é **igual** ao `amount_cents` da despesa. As cotas vêm sempre de `buildShares` de `@/domain`.
2. Todo participante de uma despesa pertence ao **dono da atividade**.
3. O cadastro cria o usuário e o participante "eu" juntos; nunca existe usuário sem "eu".
4. Editar uma despesa preserva o status de quem continua nela (`buildShares(total, ids, previous)`).
5. Status da despesa e resumo são calculados a partir das cotas, nunca gravados.

### Participante híbrido

Decisão em [ADR 0006](adr/0006-participante-hibrido.md).

- Todo participante pertence a um **dono**: é a lista de contatos daquele usuário, como no app hoje.
- O "eu" tem `is_self = true` e `user_id` = o próprio dono.
- Um participante **pode** ser vinculado a uma conta (`user_id`). Quando estiver, essa conta passa a ver as atividades em que o participante aparece (fase 6).
- `isSelf` na resposta é calculado **para quem pede**: é `true` no participante vinculado à conta logada. Assim o "Você" do app funciona também em atividades de outras pessoas.
- **Na v1 não há fluxo de vínculo:** só o "eu" tem `user_id`, e o comportamento é idêntico ao do app hoje.

## Escopo do dono

A regra de segurança mais importante do backend ([ADR 0007](adr/0007-formato-de-erro.md) explica o `404`):

- **Todo método de repositório de recurso recebe `ownerId` como primeiro parâmetro** e o usa no `where`. Não existe `findById(id)` sozinho.
- Recurso filho herda o escopo pelo pai: despesa é encontrada por `{ id, activity: { ownerId } }`; cota, pela despesa.
- Ids que vêm no corpo (como `participantIds`) também são conferidos: o serviço busca os participantes **com** o `ownerId` e, se faltar algum, responde `400 invalid` ("Participante inválido").
- Não encontrou com o escopo → `404`, igual a não existir.
- As exceções são o módulo `auth` (que procura usuário por e-mail) e a limpeza de dados expirados. Ambas vivem só em `modules/auth` e `modules/idempotency`.

```ts
// expenses/repository.ts (esboço)
findById(ownerId: string, id: string) {
  return prisma.expense.findFirst({
    where: { id, activity: { ownerId } },
    include: { shares: { orderBy: { position: 'asc' } } },
  });
}
```

## Transações

- Operação que grava em mais de uma tabela roda em `prisma.$transaction(async (tx) => …)`: cadastro (usuário + "eu"), criar e editar despesa (despesa + cotas), criação com `Idempotency-Key` (recurso + chave).
- Repositórios aceitam o cliente da transação (`tx`) por parâmetro, para o serviço compor as chamadas.
- Nada de chamada externa (e-mail, HTTP) dentro de uma transação.

## Convenções do Prisma

| Tema | Regra |
|---|---|
| Nomes | Model no singular em `PascalCase`, campo em `camelCase`; `@@map("snake_plural")` e `@map("snake_case")` para o banco |
| Schema do Postgres | `schemas = ["app"]` no `datasource` e `@@schema("app")` em todo model |
| Ids | `String @id @default(uuid()) @db.Uuid` |
| Dinheiro | `Int` com nome terminado em `Cents` (`amountCents`); `CHECK` escrito na migration |
| Instantes | `DateTime @db.Timestamptz(3)`, com `@default(now())` / `@updatedAt` |
| Data de atividade | `DateTime @db.Date`. **Cuidado:** o Prisma devolve `Date` à meia-noite **UTC**; converta com `toISOString().slice(0, 10)` e grave com `new Date(\`${date}T00:00:00Z\`)`. Nunca use o fuso local |
| Status | `enum ShareStatus { pending paid }` |
| Exclusão | `onDelete: Cascade` de atividade → despesas → cotas; `Restrict` em participante usado numa cota |
| Client | Gerado em `src/generated/` (fora do git), criado em `src/db.ts` com `@prisma/adapter-pg` e a `DATABASE_URL` |

### Ordenação

Ordenação com regra de idioma (participantes por nome, pt-BR) é feita no serviço com `a.name.localeCompare(b.name, 'pt-BR')`, igual ao mock. Assim o resultado não depende da collation do banco. Ordenação por data ou criação fica no `orderBy` do Prisma.

## Migrations

Passo a passo na skill [`backend-migration`](../../.claude/skills/backend-migration/SKILL.md). As regras:

1. **Migration aplicada é imutável.** Migration que já está na `main` nunca é editada nem apagada; correção é uma migration nova.
2. **Expand/contract** para mudança que quebra (remover ou renomear coluna, mudar tipo, tornar `NOT NULL`):
   - **expand:** adiciona o novo e mantém o velho;
   - deploy do código que usa o novo;
   - **contract:** remove o velho num PR seguinte.

   O servidor que está no ar durante o deploy, e o app antigo, continuam funcionando.
3. **Toda tabela nova** nasce com `ALTER TABLE app.<tabela> ENABLE ROW LEVEL SECURITY;` na mesma migration ([04 · Supabase](04-autenticacao-e-seguranca.md#supabase)) e, se tiver dono, índice no `owner_id`.
4. **Revise o SQL** gerado (`migrate dev --create-only`) antes de aplicar: `DROP` inesperado, `CHECK` faltando, `NOT NULL` sem default numa tabela com dados.
5. **Nomes:** `AAAAMMDDHHMMSS_verbo_objeto` (o Prisma gera o prefixo): `add_expense_shares_position`, `create_idempotency_keys`.
6. O CI aplica todas as migrations num banco vazio (`migrate deploy`) antes dos testes, e confere que o schema e as migrations estão em sincronia (`migrate diff`).

## Seed

`prisma/seed.ts` cria um usuário de desenvolvimento com atividades, despesas e cotas em vários status, usando os **serviços** (não SQL direto), para o seed respeitar as invariantes. Só roda em `NODE_ENV=development`.

## Retenção

| Dado | Quanto tempo | Como |
|---|---|---|
| `idempotency_keys` | 24 h | Removidas na própria rota de criação (no máximo 1 vez por minuto por processo) com `DELETE … WHERE created_at < now() - interval '24 hours'` |
| `refresh_tokens` revogados ou expirados | 7 dias depois de expirar | Mesma estratégia, no `refresh` |
| Dados do usuário | Até ele excluir | Exclusão de conta (LGPD) é um card futuro: apaga em cascata a partir de `users` |
