# Backend · 02 · API

Convenções da API, tabela de rotas e erros. A API espelha o contrato `DataSource` do app ([04 · Camada de dados](../04-camada-de-dados.md)): se a suíte de contrato passa contra o servidor, o app funciona sem mudar nenhuma tela.

## Convenções

| Tema | Regra |
|---|---|
| Base | `/v1`. `GET /health` e a documentação ficam fora do prefixo |
| Recursos | Substantivo no plural, `kebab-case`: `/v1/activities/:id/expenses` |
| JSON | UTF-8, campos em `camelCase` (como os tipos do domínio). `snake_case` só no banco |
| Dinheiro | Inteiro em **centavos** (`amount: 2550`). Nunca decimal nem string |
| Datas | Data de atividade: `YYYY-MM-DD`. Instantes (`createdAt`): ISO 8601 em UTC (`2026-11-10T22:58:00.000Z`) |
| Ids | UUID gerado pelo servidor. O cliente nunca escolhe o id |
| Autenticação | `Authorization: Bearer <accessToken>` em toda rota, exceto auth e `/health` ([04 · Autenticação](04-autenticacao-e-seguranca.md)) |
| Corpo | Objetos **estritos**: campo desconhecido é `400 invalid`. Limite de 100 KB por requisição |
| Resposta | Sempre passa pelo schema Zod de resposta, tipado contra o tipo do domínio (`satisfies z.ZodType<Expense>`). Campo fora do schema não sai |
| Paginação | Não há na v1: os dados de um usuário são poucos. Quando uma lista passar de ~500 itens, entra paginação por cursor (`?cursor=&limit=`) como mudança aditiva |
| Documentação | OpenAPI gerado das rotas: `/docs` (interativa) e `/openapi.json`. Não há documentação de rota escrita à mão fora desta tabela |

## Rotas

| Contrato do app (`DataSource`) | Rota | Sucesso |
|---|---|---|
| `auth.signUp` | `POST /v1/auth/sign-up` `{ name, email, password }` | `201` `{ user, accessToken, refreshToken }` |
| `auth.signIn` | `POST /v1/auth/sign-in` `{ email, password }` | `200` idem |
| (renovação de sessão) | `POST /v1/auth/refresh` `{ refreshToken }` | `200` novo par de tokens; o anterior é revogado |
| `auth.signOut` | `POST /v1/auth/sign-out` `{ refreshToken }` | `204` |
| `auth.getSession` (validação) | `GET /v1/me` | `200` `User` |
| `activities.list` | `GET /v1/activities` | `200` `ActivityListItem[]`, data desc, depois criação desc |
| `activities.get` | `GET /v1/activities/:id` | `200` `Activity` |
| `activities.create` | `POST /v1/activities` `{ title, date }` + `Idempotency-Key` | `201` `Activity` |
| `activities.update` | `PUT /v1/activities/:id` `{ title, date }` | `200` `Activity` |
| `activities.remove` | `DELETE /v1/activities/:id` | `204` (remove as despesas) |
| `expenses.listByActivity` | `GET /v1/activities/:id/expenses` | `200` `Expense[]`, criação asc |
| `expenses.create` | `POST /v1/activities/:id/expenses` `{ title, amount, participantIds }` + `Idempotency-Key` | `201` `Expense` (cotas calculadas no servidor) |
| `expenses.get` | `GET /v1/expenses/:id` | `200` `Expense` |
| `expenses.update` | `PUT /v1/expenses/:id` `{ title, amount, participantIds }` | `200` `Expense`, preservando o status de quem continua |
| `expenses.setShareStatus` | `PUT /v1/expenses/:id/shares/:participantId` `{ status }` | `200` `Expense` |
| `expenses.remove` | `DELETE /v1/expenses/:id` | `204` |
| `participants.list` | `GET /v1/participants` | `200` `ParticipantListItem[]`, por nome (pt-BR) |
| `participants.create` | `POST /v1/participants` `{ name }` + `Idempotency-Key` | `201` `Participant` |
| `summary.get` | `GET /v1/summary` | `200` `Summary` |
| — | `GET /health` | `200` `{ status: "ok", version }` (processo de pé; `version` = commit) |
| — | `GET /health/ready` | `200` se o banco responde; `503` se não |

Os formatos (`Activity`, `Expense`, `Summary`…) são os tipos de `src/domain` e `src/data/types.ts`. Mudou um deles? A rota, o schema de resposta e esta tabela mudam no mesmo PR.

### Limites de entrada

Valem no schema Zod da rota; a validação de negócio (mensagens da tela) vem de `@/domain/validation`.

| Campo | Limite |
|---|---|
| `title` (atividade, despesa), `name` (participante, usuário) | 1 a 120 caracteres após `trim` |
| `email` | E-mail válido, até 254 caracteres; gravado em minúsculas |
| `password` | 6 a 128 caracteres (6 = paridade com o app; subir para 8 é decisão de produto) |
| `amount` | Inteiro, 1 a 100.000.000 (R$ 1 milhão) |
| `participantIds` | 1 a 50 ids, sem repetição; a **ordem** é guardada (o centavo de resto vai para os primeiros) |
| `date` | `YYYY-MM-DD` válida |
| `Idempotency-Key` | 8 a 64 caracteres `[A-Za-z0-9_-]` |

## Status HTTP

| Status | Quando |
|---|---|
| `200` | Leitura ou atualização com corpo |
| `201` | Criação (corpo = o recurso criado) |
| `204` | Remoção e `sign-out` |
| `400` | Entrada inválida (`invalid`) |
| `401` | Sem token, token inválido ou expirado, credencial errada (`unauthorized`) |
| `404` | Não existe **ou** é de outro usuário (`not_found`) |
| `409` | E-mail já cadastrado; mesma `Idempotency-Key` com corpo diferente (`conflict`) |
| `429` | Rate limit (`invalid`, mensagem "Muitas tentativas. Aguarde um pouco.") |
| `500` / `503` | Erro inesperado ou banco fora (`server`) |

Não usamos `403` na v1: tudo o que não é do usuário é `404`, para não revelar que existe ([04 · Autorização](04-autenticacao-e-seguranca.md#autorização)). O `403` entra na fase 6, quando um participante vinculado poderá **ver** uma atividade mas não editá-la.

## Erros

Formato único ([ADR 0007](adr/0007-formato-de-erro.md)), com a mensagem já pronta para a tela (o app mostra com `errorMessage`):

```json
{ "error": { "code": "not_found", "message": "Despesa não encontrada" } }
```

| `code` ([04 · Erros](../04-camada-de-dados.md#erros)) | HTTP | Mensagem |
|---|---|---|
| `invalid` | 400, 429 | A da regra de `@/domain/validation` quando houver ("Informe um valor"); senão uma mensagem curta do campo ("Data inválida") |
| `unauthorized` | 401 | "Sessão expirada. Entre de novo." ou, no login, "E-mail ou senha incorretos" |
| `not_found` | 404 | "<Recurso> não encontrada(o)" |
| `conflict` | 409 | "Este e-mail já está em uso" / "Esta operação já foi enviada com outros dados" |
| `server` | 500, 503 | `DEFAULT_ERROR_MESSAGES.server` de `@/lib/errors`. Nunca stack, SQL ou nome de tabela |

- No código, erro esperado é `throw new AppError('not_found', 'Despesa não encontrada')` no serviço. O plugin de erros converte `AppError`, erro de validação do Zod, erro do rate limit e erro desconhecido (vira `server` e é logado com stack).
- Erro conhecido do Prisma é traduzido no repositório: violação de unicidade em e-mail → `conflict`; registro não encontrado → `not_found`. Nada do Prisma chega à resposta.
- Toda resposta, inclusive de erro, leva o header `x-request-id`. É o que se pede ao usuário para achar o log.
- O app converte falta de conexão em `network` e tempo esgotado em `timeout`; o servidor nunca envia esses códigos.

## Idempotência

Criações aceitam o header `Idempotency-Key` (gerado no app por operação), para que um reenvio por queda de rede não crie a despesa duas vezes ([05 · Dinheiro e duplicidade](../05-regras-de-negocio.md#dinheiro-e-duplicidade), [ADR 0009](adr/0009-idempotencia.md)).

1. Sem o header, a criação segue normal. O app sempre envia; outros clientes podem não enviar.
2. Com o header, o servidor procura `(user_id, key)` em `idempotency_keys`:
   - não existe → grava a chave com o hash do método, da rota e do corpo, executa a criação e guarda status e corpo da resposta, **na mesma transação** da criação;
   - existe com o mesmo hash → devolve a resposta guardada, sem executar de novo;
   - existe com outro hash → `409 conflict`.
3. Duas requisições simultâneas com a mesma chave: a unicidade de `(user_id, key)` garante que só uma cria; a outra recebe `409`, e o app trata como reenvio.
4. Chaves expiram em 24 h (limpeza descrita em [03 · Retenção](03-dados.md#retenção)).

`PUT` e `DELETE` já são idempotentes pela definição: repetir dá o mesmo estado final (apagar algo já apagado responde `404`, que o adaptador HTTP do app trata como sucesso na remoção).

## Concorrência

A v1 é "a última escrita vence": duas edições simultâneas da mesma despesa não geram erro. Como cada usuário só edita os próprios dados, o risco é baixo. Com o vínculo de participantes (fase 6), `expenses.setShareStatus` passa a ter dois escritores: a operação já é atômica por cota, e a edição da despesa ganha controle por versão (`If-Match` com `updatedAt`) se o problema aparecer.

## Versionamento e compatibilidade

Versões antigas do app continuam instaladas por semanas (EAS Update não atinge todo mundo na hora). Por isso, dentro de `/v1`:

- **Pode:** rota nova, campo novo **opcional** na entrada, campo novo na resposta, novo valor de erro com `code` existente.
- **Não pode:** remover ou renomear campo, mudar tipo ou formato, tornar obrigatório um campo opcional, mudar o significado de um status ou `code`.
- Mudança que quebra vira `/v2` para aquela rota, com as duas versões no ar até a versão mínima do app deixar de usar a antiga.
- O schema de resposta Zod e a suíte de contrato pegam a quebra acidental: rodam no CI em todo PR que toca `server/`.
