---
name: backend-endpoint
description: Rota da API em server/ — criar ou mudar endpoint, schema de entrada/saída, serviço ou repositório de um módulo do backend. Use antes de editar server/src/modules.
---

# Rota do backend

Uma rota nasce do **contrato** e termina com os **casos obrigatórios** testados. Siga os passos em ordem; cada um termina num critério que você confere antes do próximo.

Antes de usar uma API do Fastify, do Zod ou do Prisma, consulte a documentação da versão que está em `server/package.json` (Context7 ou site oficial). Essas APIs mudam entre versões maiores.

## 1. Contrato primeiro

Leia a linha da rota em [docs/backend/02-api.md](../../../docs/backend/02-api.md#rotas) e a operação correspondente em `src/data/types.ts`.

- Rota nova ou mudança de formato: atualize a tabela de rotas **neste PR**. Se o app usa a operação, o contrato (`src/data/types.ts`), o mock e a suíte `src/test/data-source-contract.ts` mudam juntos. Mudança de contrato é tarefa grande: precisa de plano aprovado ([docs/13](../../../docs/13-ia-no-desenvolvimento.md#plano-e-contrato-de-verificação)).
- Mudança em `/v1` só pode ser **aditiva** ([02 · Versionamento](../../../docs/backend/02-api.md#versionamento-e-compatibilidade)).

**Pronto quando:** método, URL, corpo, status de sucesso, formato da resposta e erros possíveis estão escritos na tabela e batem com o tipo do domínio.

## 2. Schemas (`schemas.ts`)

- Zod para `params`, `querystring`, `body` e `response` de cada status de sucesso.
- Objetos estritos; limites de [02 · Limites de entrada](../../../docs/backend/02-api.md#limites-de-entrada).
- Resposta tipada contra o domínio: `export const expenseResponse = z.object({ … }) satisfies z.ZodType<Expense>`.

**Pronto quando:** o typecheck acusa qualquer diferença entre o schema de resposta e o tipo de `@/domain`.

## 3. Repositório (`repository.ts`)

- **Escopo do dono:** todo método recebe `ownerId` como primeiro parâmetro e filtra por ele; filho filtra pelo dono do pai (`{ id, activity: { ownerId } }`). Ids vindos do corpo também são buscados com o `ownerId` ([03 · Escopo do dono](../../../docs/backend/03-dados.md#escopo-do-dono)).
- Recebe o cliente Prisma (ou o `tx` da transação) por parâmetro.
- Converte linha do banco em modelo de domínio aqui: `amountCents` → `amount`, `@db.Date` → `YYYY-MM-DD` em UTC, cotas ordenadas por `position`.
- Traduz erro conhecido do Prisma (unicidade, não encontrado) em `AppError`.

**Pronto quando:** nenhuma consulta deste módulo encontra um registro sem o `ownerId` no `where`.

## 4. Serviço (`service.ts`)

- Regra de dinheiro, divisão, status, resumo e validação vêm de `@/domain` (`buildShares`, `getExpenseStatus`, `getSummary`, `getExpenseInputError`…). O servidor **usa** o domínio; regra que falta no domínio entra em `src/domain` com teste, no mesmo PR.
- Erro esperado: `throw new AppError(code, mensagem para a tela)` ([02 · Erros](../../../docs/backend/02-api.md#erros)). Recurso fora do escopo é `not_found`.
- Grava em mais de uma tabela → `prisma.$transaction(async (tx) => …)`.
- Criação: passa pelo módulo `idempotency` quando a rota aceita `Idempotency-Key` ([02 · Idempotência](../../../docs/backend/02-api.md#idempotência)).

**Pronto quando:** o serviço não importa Fastify nem monta SQL, e toda regra de negócio usada tem origem em `@/domain`.

## 5. Rota (`routes.ts`)

- **Rota fina:** declara método, URL, schemas, `preHandler: app.authenticate` (só auth e `/health` são públicas) e o status; chama um método do serviço com `request.userId`.
- Sem `try/catch`: o plugin de erros converte tudo.
- Registrada no módulo, sob o prefixo `/v1`.

**Pronto quando:** o handler cabe em poucas linhas e não contém regra.

## 6. Testes (`server/test/<recurso>.test.ts`)

Cubra, para cada rota criada ou alterada, **todos** os casos obrigatórios de [05 · Casos obrigatórios por rota](../../../docs/backend/05-testes.md#casos-obrigatórios-por-rota) (sucesso, entrada inválida, sem token, de outro usuário, inexistente) e os extras do tipo de rota (idempotência, soma das cotas, ordenação). Dados criados pela API com os helpers; corpo da resposta afirmado por inteiro.

**Pronto quando:** cada caso obrigatório tem um `it` próprio e `cd server && npm run check` passa.

## 7. Docs e PR

- Tabela de rotas e, se mudou, limites, erros ou modelo atualizados em `docs/backend/`.
- Descrição do PR com a seção **Contrato de verificação**: cada critério de aceite ligado ao `it` que o prova.

**Pronto quando:** o `/docs` (OpenAPI) mostra a rota com os schemas, e a tabela de rotas bate com o código.
