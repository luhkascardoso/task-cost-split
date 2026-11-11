# Regras de backend do code review

Aplique **todas** quando o diff tocar `server/**`. As regras de origem estão em `docs/backend/` (índice em `docs/15-backend.md`). A severidade segue a seção 5 do `SKILL.md`.

## Escopo do dono e autorização
- Consulta de recurso sem `ownerId` no `where` (direto ou pelo pai: `{ activity: { ownerId } }`), fora de `modules/auth` e `modules/idempotency` → **crítico**: um usuário lê ou altera dados de outro.
- Id vindo do corpo (`participantIds`…) usado sem conferir que pertence ao dono → **crítico**.
- Recurso de outro usuário respondendo `403`, ou mensagem que revela que ele existe → alto (`docs/backend/02` · Status HTTP).
- Rota autenticada sem `preHandler: app.authenticate` → **crítico**.

## Dinheiro e domínio
- Divisão, status, resumo ou validação reescritos no `server/` em vez de vir de `@/domain` → alto (ADR 0004). Cálculo errado de centavos → crítico.
- Cotas gravadas sem `buildShares`, ou soma das cotas diferente do valor → crítico.
- Gravação em mais de uma tabela fora de `$transaction` → alto (`docs/backend/03` · Transações).
- Import do app além de `@/domain` e `@/lib/errors` (ex.: `@/data`, `@/features`, React, Expo), ou o app importando `server/` → alto (`docs/backend/01` · Domínio compartilhado).

## Camadas
- Rota com regra, `try/catch` ou Prisma; serviço com Fastify (`request`, `reply`) ou SQL; repositório com regra de negócio → médio (alto se a regra for de dinheiro) (`docs/backend/01` · Camadas).
- Módulo importando o repositório de outro módulo em vez do serviço → médio.
- `process.env` lido fora de `src/env.ts`, ou `prisma` importado como singleton em vez de injetado → médio.

## Contrato da API
- Rota sem schema Zod de **resposta**, ou schema de resposta não tipado contra o tipo do domínio → alto (pode vazar `password_hash`, `owner_id`).
- Objeto de entrada não estrito, ou sem os limites de `docs/backend/02` · Limites de entrada → médio.
- Em `/v1`: campo removido ou renomeado, tipo ou formato alterado, campo opcional virando obrigatório → alto (quebra versões instaladas do app).
- Erro fora do formato `{ error: { code, message } }`, com `code` fora de `DataErrorCode`, ou com stack, SQL ou mensagem do Prisma na resposta → alto.
- Rota nova ou alterada sem a linha correspondente atualizada na tabela de rotas de `docs/backend/02` → médio.
- Criação sem suporte a `Idempotency-Key` → alto (`docs/backend/02` · Idempotência).

## Banco e migrations
- Migration que já existe na branch base editada, renomeada ou apagada (confira com `changes.txt`: `M`, `R` ou `D` em `server/prisma/migrations/`) → alto.
- Tabela nova sem `ENABLE ROW LEVEL SECURITY` na migration → alto.
- `DROP`, `ALTER COLUMN … TYPE` ou `NOT NULL` novo em coluna existente no mesmo PR que muda o código que usava o antigo (sem expand/contract) → alto.
- Dinheiro sem `CHECK` ou fora de `Int`/`*_cents`; tabela com dono sem índice em `owner_id` → médio.
- Coluna `@db.Date` convertida com fuso local (`getDate()`, `toLocaleDateString`) em vez de UTC → alto (data muda de dia).

## Segurança
- Senha com hash que não é argon2id; refresh token guardado sem hash; JWT com payload além de `sub`/`iat`/`exp` → crítico.
- Rota de auth sem rate limit, ou login com mensagens diferentes para e-mail e senha errados → alto.
- Segredo, URL de banco ou chave do Supabase no código, no `.env.example` com valor real, ou em log → crítico.
- Campo sensível novo (token, senha, documento) fora do `redact` do logger → alto.

## Testes
- Rota criada ou alterada sem algum caso obrigatório de `docs/backend/05` · Casos obrigatórios por rota (sucesso, inválido, sem token, de outro usuário, inexistente) → médio por caso; alto se faltar o "de outro usuário".
- Mock de Prisma ou de repositório em teste de rota → médio (ADR 0008).
- Teste que afirma só o status, sem o corpo → baixo.
