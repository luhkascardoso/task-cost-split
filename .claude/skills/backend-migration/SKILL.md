---
name: backend-migration
description: Migration do banco do backend — tabela, coluna, índice, constraint ou dado no Prisma (server/prisma). Use antes de editar schema.prisma ou criar migration.
---

# Migration do backend

O banco de produção tem dados e um servidor rodando durante o deploy. Toda migration precisa ser segura para os dois. Regras completas em [docs/backend/03-dados.md](../../../docs/backend/03-dados.md#migrations).

Antes de usar um comando ou atributo do Prisma, consulte a documentação da versão que está em `server/package.json` (Context7 ou site oficial).

## 1. Classifique a mudança

| Tipo | Exemplos | Caminho |
|---|---|---|
| **Aditiva** | Tabela nova, coluna nova que aceita nulo ou tem default, índice, constraint que os dados atuais já cumprem | Uma migration |
| **Quebra** | Remover ou renomear coluna ou tabela, mudar tipo, tornar `NOT NULL`, constraint que dados antigos violam | **Expand/contract** em PRs separados |

Expand/contract:
1. **Expand:** adiciona o novo ao lado do velho (e copia os dados, se precisar).
2. Deploy do código que lê e escreve o novo.
3. **Contract:** num PR seguinte, remove o velho.

**Pronto quando:** você sabe em qual dos dois casos está e, se for quebra, qual destes três passos este PR entrega.

## 2. Edite o `schema.prisma`

Siga [03 · Convenções do Prisma](../../../docs/backend/03-dados.md#convenções-do-prisma):
- model singular com `@@map("snake_plural")` e `@@schema("app")`;
- campos com `@map("snake_case")`;
- ids `@db.Uuid`;
- dinheiro `Int` terminado em `Cents`;
- instantes `@db.Timestamptz(3)`;
- data de atividade `@db.Date`.

Tabela com dono tem `ownerId` e `@@index([ownerId])`.

**Pronto quando:** `npx prisma validate` passa.

## 3. Gere sem aplicar e revise o SQL

```bash
cd server
npx prisma migrate dev --create-only --name verbo_objeto   # ex.: add_expense_shares_position
```

Abra o `migration.sql` gerado e complete à mão o que o Prisma não gera:
- **Toda tabela nova:** `ALTER TABLE app.<tabela> ENABLE ROW LEVEL SECURITY;`
- `CHECK` de dinheiro (`amount_cents > 0` na despesa, `>= 0` na cota) e de valores fixos.
- Índice parcial ou único condicional (ex.: um `is_self` por dono).
- Coluna nova `NOT NULL` em tabela com dados: default ou preenchimento antes da constraint.

Procure no SQL por `DROP` e `ALTER COLUMN … TYPE`: só aparecem no passo de contract.

**Pronto quando:** o SQL faz exatamente o que o passo 1 decidiu, e toda tabela nova tem RLS.

## 4. Aplique e teste

```bash
npx prisma migrate dev     # aplica no banco local e regenera o client
npm test                   # o globalSetup aplica as migrations do zero no banco de teste
```

Ajuste repositórios e testes que usam o que mudou (skill `backend-endpoint` para as rotas).

**Pronto quando:** as migrations aplicam num banco **vazio** e `npm run check` passa.

## 5. Proteja o histórico

- Migration que já está na `main` é **imutável**: correção é uma migration nova.
- Não apague nem renomeie pastas em `prisma/migrations/`.
- Conflito de migrations entre branches: refaça a sua com `--create-only` sobre a `main` atualizada.

**Pronto quando:** `git diff origin/main -- server/prisma/migrations` só mostra pastas novas.

## 6. Docs e PR

- [03 · Modelo](../../../docs/backend/03-dados.md#modelo) atualizado (tabela, colunas, restrições).
- A descrição do PR diz se é aditiva, expand ou contract e, no expand, qual card fará o contract.

**Pronto quando:** a tabela do modelo bate com o `schema.prisma`.
