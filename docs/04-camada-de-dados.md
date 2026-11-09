# 04 · Camada de dados

O app **não conhece nenhum backend**. Ele depende de uma interface, `DataSource`, definida em `src/data/types.ts`. A implementação é escolhida num único ponto, `src/data/index.ts`, pela variável `EXPO_PUBLIC_DATA_SOURCE`.

```
features/*/api.ts (hooks React Query)
        │  importam só `data` e tipos de @/data
        ▼
src/data/index.ts  ── EXPO_PUBLIC_DATA_SOURCE ──┬── 'mock' → src/data/mock/   ✅ hoje
                                                └── 'http' → src/data/http/   ⏳ quando o backend existir
```

## Implementações

| Fonte | Status | Uso |
|---|---|---|
| `mock` | ✅ pronta e testada (`src/data/__tests__`) | Desenvolvimento sem servidor. Dados num JSON no **AsyncStorage** do aparelho, com latência artificial de 250 ms para exercitar os loadings. |
| `http` | ⏳ não existe | Adaptador para o backend próprio, ainda a definir. |

> ⚠️ O mock guarda a senha em texto puro e não tem segurança nenhuma. É **só para desenvolvimento**. Para "zerar" os dados, apague o app ou limpe o storage (chave `taskcost:mockdb:v1`).

## O contrato (`DataSource`)

| Grupo | Operação | Retorna | Tela que usa |
|---|---|---|---|
| `auth` | `getSession()` | `Session \| null` | Root layout (restaurar login) |
| | `signIn({email, password})` | `Session` | Login |
| | `signUp({name, email, password})` | `Session` | Cadastro |
| | `signOut()` | — | (ainda sem botão) |
| `activities` | `list()` | `ActivityListItem[]` (com `total`, `expensesCount`, `participantIds`) | Atividades |
| | `get(id)` · `create(input)` · `update(id, input)` · `remove(id)` | `Activity` | Detalhe / sheets |
| `expenses` | `listByActivity(activityId)` | `Expense[]` (com `shares`) | Detalhe da atividade |
| | `get(id)` · `create(activityId, input)` · `update(id, input)` · `remove(id)` | `Expense` | Sheets de despesa |
| | `setShareStatus(expenseId, participantId, status)` | `Expense` | `Pendente \| Pago` |
| `participants` | `list()` | `ParticipantListItem[]` (com `activitiesCount`, inclui o "eu") | Participantes, seletor |
| | `create(name)` | `Participant` | Seletor da despesa |
| `summary` | `get()` | `Summary` | Resumo |

### Regras que qualquer implementação deve cumprir

1. **Dinheiro em centavos** (inteiros). **Datas** de atividade em `YYYY-MM-DD`.
2. **A divisão é responsabilidade da fonte de dados.** O app envia só `participantIds` (a ordem importa). A fonte calcula as cotas com a regra de [05](05-regras-de-negocio.md). No backend, isso garante que o cliente não consiga gravar cotas inconsistentes.
3. Ao **editar** uma despesa, o status de quem continua nela é preservado.
4. **Excluir atividade** exclui as despesas dela.
5. **Cadastro** cria o participante "eu" (`isSelf: true`) com o nome do usuário.
6. Tudo, exceto auth, é **escopado ao usuário logado**. Sem sessão, lança `DataError` com `code: 'unauthorized'`.
7. Todo erro sai como `DataError(message, code)`, com a mensagem pronta para a UI. Os códigos e o que cada um significa estão em [Erros](#erros).

A suíte `src/data/__tests__/mock-data-source.test.ts` documenta essas regras na prática. **Reaproveite os mesmos cenários para testar o adaptador HTTP.**

## Erros

A camada de dados transmite **um único tipo de erro**: `DataError`. Hooks e telas nunca lidam com erro de `fetch`, status HTTP ou exceção crua.

| `code` | Quando | Repetir automaticamente? |
|---|---|---|
| `unauthorized` | Sem sessão, sessão expirada, credencial inválida | Não |
| `not_found` | Recurso inexistente ou de outro usuário | Não |
| `conflict` | Conflito de estado (ex.: e-mail já cadastrado) | Não |
| `invalid` | Entrada inválida (regras de `src/domain/validation.ts`) | Não |
| `network` | Sem conexão | Só leitura, até 2 vezes |
| `timeout` | O serviço não respondeu a tempo | Só leitura, até 2 vezes |
| `server` | Erro 5xx / serviço indisponível | Só leitura, até 2 vezes |
| `unknown` | Qualquer erro não mapeado (normalizado por `toDataError`) | Não |

Fluxo:

```
implementação de DataSource ── lança DataError (ou passa o erro por toDataError)
        │
        ▼
hook de feature (React Query) ── retry só para network/timeout/server em queries;
        │                         mutations nunca repetem (ver 05 · Dinheiro e duplicidade)
        ▼
tela ── errorMessage(error) (src/lib/error-message.ts): mostra a mensagem do DataError
        ou um texto genérico, nunca a mensagem técnica de um erro inesperado
```

Regras:

- **Não mascare o erro** com `throw new Error('Falha…')`: isso apaga o código e o contexto. Lance `DataError` com o código certo, ou deixe o erro subir até o ponto de normalização.
- **Normalize num ponto só**: no adaptador, envolva as chamadas em `try/catch` e devolva `toDataError(err)` para o que não foi mapeado. `status` (HTTP) e `original` (erro de origem) ficam no `DataError` para diagnóstico e **nunca** vão para a tela.
- **Toda falha de escrita aparece na tela.** Quem chama `mutateAsync` trata a rejeição (mensagem no formulário ou `Alert`). Update otimista que reverte mostra a mensagem do erro, não volta em silêncio.
- A política de retry está em `src/lib/query-client.ts` (`shouldRetryQuery`) e a lista do que é recuperável, em `src/data/errors.ts` (`isRecoverableError`).

## Modelo de dados (lógico)

O modelo que o contrato pressupõe. Ele é independente de banco e serve de referência para quem for desenhar o backend.

```
User 1──* Participant      (contatos do usuário; exatamente 1 com isSelf=true)
User 1──* Activity
Activity 1──* Expense
Expense 1──* ExpenseShare *──1 Participant
            (amount em centavos, status pending|paid)
```

O que é **derivado** (não precisa ser armazenado):

- participantes de uma atividade = união dos participantes das despesas dela;
- total da atividade = soma das despesas;
- status da despesa (Pago/Pendente/Parcial) vem das cotas;
- "Em N atividades" de um participante.

## Plugando o backend (quando for a hora)

1. Criar `src/data/http/http-data-source.ts` exportando `createHttpDataSource(deps): DataSource`. As dependências (URL base, armazenamento de token, `fetch`) entram por parâmetro, como no mock (ver [11 · SOLID](11-solid.md#d--inversão-de-dependência)).
2. Guardar os tokens com **`expo-secure-store`** (não AsyncStorage) e enviar `Authorization: Bearer <accessToken>`.
3. Converter erros em `DataError`: sem conexão → `network`, timeout → `timeout`, 5xx → `server`, 401 → `unauthorized`, 404 → `not_found`, 409 → `conflict`, outros 4xx → `invalid`, guardando o `status`. O resto passa por `toDataError`.
4. **Validar o corpo das respostas** com schemas Zod (o projeto já usa Zod nos formulários). Resposta fora do contrato vira `DataError` (`unknown`) e não chega às telas com campos faltando.
5. **Escritas com identificador de idempotência**: criar despesa/atividade envia um id gerado no app, para o backend ignorar reenvios (ver [05](05-regras-de-negocio.md#dinheiro-e-duplicidade)).
6. Adicionar o `case 'http'` em `src/data/index.ts` e uma env `EXPO_PUBLIC_API_URL`.
7. Rodar a **suíte de contrato** contra o adaptador: `runDataSourceContract('http', () => createHttpDataSource(…))`, de `src/test/data-source-contract.ts`. É a mesma suíte que o mock já passa.

## Testes de contrato

`src/test/data-source-contract.ts` reúne os cenários que **toda** implementação de `DataSource` precisa passar: auth, ordenação, `DataError` com `code`, divisão, isolamento por usuário. O mock a executa em `src/data/__tests__/mock-data-source.test.ts`. Comportamento exclusivo de uma implementação (ex.: persistência no `KeyValueStorage`) é testado só no arquivo dela.

Mudou o contrato em `types.ts`? Atualize a suíte junto.

Nada em `src/app` ou `src/features` precisa mudar.
