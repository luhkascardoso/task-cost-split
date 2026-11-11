# Backend · 05 · Testes

Como o `server/` é testado. Princípios gerais de teste do projeto em [09 · Testes](../09-testes.md); decisão de testar contra Postgres real em [ADR 0008](adr/0008-testes-contra-postgres-real.md).

## Níveis

| Nível | O quê | Ferramenta | Onde |
|---|---|---|---|
| Domínio | Regras de dinheiro, divisão, status, resumo (já existem) | Jest do app | `src/domain/__tests__` |
| API | Cada rota pela superfície HTTP, com banco de verdade | Vitest + `app.inject()` + Postgres | `server/test/<recurso>.test.ts` |
| Unitário | Funções puras do servidor que valem um teste próprio (tokens, mapeamento de erro do Prisma, regra de permissão) | Vitest | `server/test/unit/` |
| Contrato | A suíte do app (`runDataSourceContract`) contra o adaptador HTTP falando com o servidor | Vitest | `server/test/contract.test.ts` (fase 4) |

O grosso é o teste de **API**: ele exercita rota, schema, serviço, repositório e banco juntos, que é onde os bugs de backend moram (escopo do dono, transação, `@db.Date`). Não há mock de Prisma nem de repositório.

## Casos obrigatórios por rota

Todo PR que cria ou muda uma rota cobre, para ela:

| Caso | Espera |
|---|---|
| Sucesso | Status e corpo do contrato (formato completo, não só o status) |
| Entrada inválida | `400`, `code: "invalid"`, mensagem da regra (um caso por regra de `@/domain/validation` que a rota usa) |
| Sem token / token inválido | `401`, `code: "unauthorized"` (rotas autenticadas) |
| Recurso de outro usuário | `404`, `code: "not_found"`, e o recurso **não** foi alterado (rotas com `:id` ou ids no corpo) |
| Inexistente | `404` com um UUID válido que não existe |

E, conforme a rota:

| Rota | Caso extra |
|---|---|
| Criação com `Idempotency-Key` | Reenvio igual devolve o mesmo corpo e não duplica; mesma chave com outro corpo dá `409` |
| Despesa (criar, editar) | Soma das cotas = valor, com valor que deixa resto (ex.: 1000 entre 3); ordem das cotas = ordem enviada; editar preserva o status de quem continua |
| Listas | Ordenação do contrato e isolamento entre dois usuários |
| Auth | Rotação, reuso de refresh revogado revoga a família, e-mail em maiúsculas, mensagem única de login |

## Ambiente de teste

- **Banco:** Postgres do `docker-compose.yml` (local) ou serviço `postgres` do job no CI, num banco `taskcost_test` separado do de desenvolvimento.
- **Schema:** o `globalSetup` do Vitest roda `prisma migrate deploy` uma vez. Se as migrations não aplicam num banco vazio, nenhum teste roda.
- **Isolamento:** `beforeEach` limpa as tabelas (`TRUNCATE … RESTART IDENTITY CASCADE` em todas as do schema `app`). Os arquivos rodam em série (`fileParallelism: false`): mais lento que paralelo, mas sem teste dependendo de outro. Se a suíte passar de ~2 min, troque por um schema por worker.
- **App:** `buildTestApp()` chama `buildApp` com o Prisma do banco de teste e um relógio controlável; `app.inject()` faz as requisições sem abrir porta.
- **Tempo:** expiração de token e de idempotência é testada avançando o relógio injetado, nunca com `sleep`.

## Helpers e dados

```ts
// test/helpers.ts (esboço)
const app = await buildTestApp();                      // relógio fixo, banco limpo
const ana = await signUpUser(app, { name: 'Ana' });     // cria pela API; devolve { user, token, selfId }
const res = await app.inject({
  method: 'POST', url: '/v1/activities',
  headers: auth(ana.token), payload: { title: 'Viagem', date: '2026-11-10' },
});
```

- Dados são criados **pela API** (`signUpUser`, `createActivity`, `createExpense`), não por SQL. Assim os testes passam pelas mesmas invariantes que o app.
- SQL direto só para montar estado que a API não permite (ex.: refresh token expirado), com um comentário dizendo por quê.
- Valores realistas, em centavos, com resto: `1000` entre 3, não `900`.

## Convenções

- Descrições em português, no formato "faz X quando Y", como no app: `it('responde 404 para despesa de outro usuário')`.
- Um comportamento por `it`; AAA separado por linha em branco.
- Um `describe` por rota (`describe('POST /v1/activities/:id/expenses')`).
- Afirme o **corpo** além do status: `expect(res.json()).toEqual({ error: { code: 'not_found', message: 'Despesa não encontrada' } })`.

## Cobertura

Limite mínimo no `vitest.config.ts`, que o CI exige:

| Pasta | Linhas | Ramos |
|---|---|---|
| `server/src/modules/**` | 90% | 85% |
| `server/src/**` (resto) | 80% | 75% |

Cobertura alta com os casos obrigatórios acima é consequência, não objetivo: teste que só "passa pela linha" sem afirmar o corpo não conta no review.

## Suíte de contrato (fase 4)

`src/test/data-source-contract.ts` usa só `describe`, `it` e `expect`, que o Vitest oferece com `globals: true`. O `server/test/contract.test.ts`:

1. sobe o app com `app.listen({ port: 0 })` contra o banco de teste;
2. cria o adaptador `createHttpDataSource({ baseUrl, fetch, tokenStorage: memória })`;
3. roda `runDataSourceContract('http', …)`, limpando o banco antes de cada cenário.

Se ela passar, o app funciona com o backend sem mudar telas. Ela é o critério de aceite da fase 4 (LUH-9).

## Comandos

```bash
cd server
docker compose up -d db          # Postgres local
npm test                         # Vitest (aplica migrations no banco de teste)
npm run test:coverage            # com o limite de cobertura do CI
npm run check                    # typecheck + lint + testes, o mesmo do job `server` no CI
```
