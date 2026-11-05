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
7. Erros esperados viram `DataError(message, code)`, com a mensagem pronta para a UI e `code` ∈ `unauthorized | not_found | conflict | invalid`.

A suíte `src/data/__tests__/mock-data-source.test.ts` documenta essas regras na prática. **Reaproveite os mesmos cenários para testar o adaptador HTTP.**

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

1. Criar `src/data/http/http-data-source.ts` exportando `createHttpDataSource(): DataSource`.
2. Guardar os tokens com **`expo-secure-store`** (não AsyncStorage) e enviar `Authorization: Bearer <accessToken>`.
3. Converter respostas HTTP de erro em `DataError` (401 → `unauthorized`, 404 → `not_found`, 409 → `conflict`, 4xx → `invalid`).
4. Adicionar o `case 'http'` em `src/data/index.ts` e uma env `EXPO_PUBLIC_API_URL`.
5. Rodar os cenários de teste do mock contra o adaptador.

Nada em `src/app` ou `src/features` precisa mudar.
