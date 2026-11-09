# 11 · Princípios SOLID no projeto

O SOLID nasceu para código orientado a classes. Este app é React funcional e quase não usa classes. Por isso, este guia traduz cada princípio para os nossos blocos de construção: **rotas, componentes, hooks, funções de domínio e o contrato `DataSource`**.

Leia junto com [01 · Arquitetura](01-arquitetura.md) e [06 · Convenções](06-convencoes.md). Este doc explica o **porquê** das regras; aqueles explicam o **como**.

> **Regra de ouro:** cada arquivo tem um motivo para mudar, depende só de abstrações e pode ser estendido sem editar quem já o usa.

---

## Como os princípios mapeiam para as camadas

| Camada | S | O | L | I | D |
|---|---|---|---|---|---|
| `src/app/` (rotas) | Só compõe e navega | — | — | Passa props mínimas | Usa hooks de feature, nunca `data` |
| `src/features/*/api.ts` | Só cache + chamada | Novas queries sem editar telas | — | Hooks pedem só o que usam | Depende de `DataSource`, nunca de `data/mock` |
| `src/features/*/components/` | Uma tarefa de UI por componente | Variações por props/mapas | — | Props mínimas | Recebe dados via hooks/props |
| `src/domain/` | Uma regra por função | Pontos de extensão por mapa/estratégia | — | Recebe `Pick<>` dos tipos | Não importa nada do app |
| `src/data/` | Contrato ≠ implementação | Nova fonte = nova pasta | **Toda implementação cumpre o contrato** | Sub-interfaces por recurso | Dependências injetadas na fábrica |
| `src/components/ui/` | Um componente visual | Variantes por mapa | — | Props mínimas | Consome só `@/theme` |

---

## S · Responsabilidade Única

> Um módulo deve ter **um, e apenas um, motivo para mudar**.

### No projeto

| Tipo de arquivo | Seu único motivo para mudar |
|---|---|
| Rota (`src/app/**`) | O layout ou a navegação da tela mudou |
| `features/*/api.ts` | A forma de buscar ou invalidar dados mudou |
| `features/*/schemas.ts` | As regras de validação do formulário mudaram |
| `features/*/components/*` | A UI daquele pedaço mudou |
| `src/domain/*.ts` | A regra de negócio mudou |
| `src/data/<impl>/` | O meio de persistência mudou (AsyncStorage, HTTP…) |

### ✅ Faça

```ts
// src/domain/status.ts: só a regra de status agregado
export function getExpenseStatus(shares: readonly Pick<ExpenseShare, 'status'>[]): ExpenseStatus { … }
```

```tsx
// src/app/(app)/activity/[activityId]/edit.tsx: rota fina, só compõe hook + componente
export default function EditActivitySheet() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const { data } = useActivity(activityId);
  if (!data) return <ActivityIndicator color={colors.brand} style={{ padding: 48 }} />;
  return <ActivityFormSheet activity={data} />;
}
```

### ❌ Evite

- **Regra de negócio dentro da implementação de dados.** Se a regra vale para mock *e* backend, ela mora em `src/domain` e as duas implementações a chamam.
- **Componentes "faz-tudo"**: formulário + busca + criação de entidade + máscara no mesmo arquivo. Extraia hooks ou subcomponentes. Exemplo: `ExpenseFormSheet` delega a busca/criação de participantes a `<ParticipantPicker>`.
- **Rotas com lógica**: confirmações, cálculos e mapeamentos vão para um hook da feature ou um componente.
- **Duplicar derivações**: se dois lugares montam o mesmo `Map` de nomes, use o hook existente (`useParticipantNames`).

**Sinal de alerta:** um arquivo acima de ~120 linhas, ou um componente com mais de um `useMutation` de features diferentes. Pare e pergunte: *"quantos motivos ele tem para mudar?"*

---

## O · Aberto/Fechado

> Aberto para extensão, fechado para modificação. Adicione comportamento **sem editar** o código que já funciona.

### No projeto

- **Fonte de dados:** o backend HTTP entra criando `src/data/http/`. Nenhuma tela ou hook muda. A única edição permitida é o `case` em `src/data/index.ts`, que é a *composition root* (o ponto de montagem).
- **Cache:** chaves novas entram em `queryKeys` sem alterar as existentes.
- **Variantes e estados:** use **mapas tipados** (`Record<Union, …>`) em vez de cadeias de `if`/ternários. Assim, uma variante nova é uma linha nova, e o TypeScript aponta tudo o que falta.

### ✅ Faça

```ts
type Variant = 'primary' | 'secondary' | 'danger';

const variantStyles: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: colors.brand, fg: colors.textOnBrand },
  secondary: { bg: colors.buttonSecondary, fg: colors.textPrimary },
  danger: { bg: colors.buttonSecondary, fg: colors.danger },
};
// Nova variante = nova entrada. O TS falha se faltar alguma.
```

```ts
// Rótulos e cores por status vêm de um mapa único (domínio/tema), nunca de ternários espalhados
export const expenseStatusLabel: Record<ExpenseStatus, string> = { … };
```

### ❌ Evite

```ts
// Cada variante nova obriga a editar N ternários em lugares diferentes
const fg = variant === 'primary' ? a : variant === 'danger' ? b : c;
```

### Quando criar um ponto de extensão

Não crie abstrações "para o futuro" (YAGNI). Crie quando **o segundo caso real aparecer**. Exemplo: se surgir divisão por porcentagem, `splitEvenly` vira uma de várias estratégias:

```ts
type SplitStrategy = (total: Cents, participantIds: readonly string[]) => Map<string, Cents>;
const strategies: Record<SplitMode, SplitStrategy> = { even: splitEvenly, percent: splitByPercent };
```

---

## L · Substituição de Liskov

> Quem implementa um contrato deve poder **substituir** qualquer outra implementação sem quebrar o app.

Quase não usamos herança. Aqui o LSP vale para as **implementações de interfaces**, principalmente o `DataSource`.

### Regras

1. **O contrato é o comportamento, não só os tipos.** Os comentários em `src/data/types.ts` fazem parte do contrato: ordenação das listas, centavos inteiros, erros como `DataError`, divisão feita pela fonte, escopo por usuário. Uma implementação que compila mas ordena diferente **viola** o LSP.
2. **Erros esperados são sempre `DataError`** com `code` (`unauthorized`, `not_found`, `conflict`, `invalid`). Nunca deixe vazar um erro de `fetch` ou um status HTTP cru para a UI. O adaptador traduz.
3. **Não exija mais nem entregue menos.** Uma implementação não pode pedir pré-condições extras (ex.: "chame `init()` antes") nem devolver menos campos que o tipo promete.
4. **Testes de contrato:** os cenários da fonte de dados ficam em `src/test/data-source-contract.ts` e rodam contra **qualquer** implementação, parametrizados pela fábrica:

```ts
// src/data/__tests__/mock-data-source.test.ts
runDataSourceContract('mock', () => createMockDataSource({ storage: memoryStorage(), latencyMs: 0 }));
// futuro: src/data/__tests__/http-data-source.test.ts
runDataSourceContract('http', () => createHttpDataSource({ … }));
```

   A suíte fica fora de `__tests__/` porque o Jest executa tudo nessa pasta. Cenário novo do contrato vai na suíte; comportamento exclusivo de uma implementação vai no teste dela.

5. **Componentes que estendem props nativas** (ex.: `ButtonProps extends PressableProps`) precisam respeitar as props herdadas. Se `disabled` existe no tipo, ele tem que funcionar.

---

## I · Segregação de Interface

> Ninguém deve depender de métodos que não usa. Prefira várias interfaces pequenas a uma "faz-tudo".

### No projeto

- **`KeyValueStorage`** (`src/data/mock/mock-data-source.ts`) é o modelo a seguir: o mock precisa só de `getItem`/`setItem`, então depende só disso, e não do AsyncStorage inteiro. Nos testes, basta um `Map` em memória.
- **`DataSource` é dividido por recurso** (`auth`, `activities`, `expenses`, `participants`, `summary`). Ao adicionar um recurso novo, crie um grupo novo; não pendure métodos num grupo que não é dele.
- Ao criar uma sub-interface nova, **dê um nome** a ela (`export interface CategoriesSource { … }`) para que funções possam depender só daquele pedaço.

### ✅ Faça

```ts
// Função de domínio pede só os campos que usa
export function getExpenseStatus(shares: readonly Pick<ExpenseShare, 'status'>[]) { … }

// Hook pede só o que usa
export function useSetShareStatus(expense: Pick<Expense, 'id' | 'activityId'>) { … }

// Componente recebe dados prontos e callbacks, não a entidade inteira + hooks internos
<ExpenseCard expense={item} participantNames={names} onPress={openExpense} />
```

### ❌ Evite

- Passar `Expense` inteiro quando só `id` é usado.
- Props "saco de gatos" (`options`, `config`, `extra`) com campos que só uma tela usa.
- Componentes de `@/components/ui` que recebem tipos de feature. Eles devem receber primitivos ou tipos do domínio (`ShareStatus`), nunca `ActivityListItem`.

---

## D · Inversão de Dependência

> Dependa de **abstrações**, não de implementações concretas. Alto nível não depende de baixo nível.

### Direção das dependências (obrigatória)

```
src/app  →  src/features  →  src/data (contrato)  ←  src/data/mock | src/data/http
                    ↘            ↓
                      src/domain (não importa nada)
```

### Regras

1. **Ninguém fora de `src/data/` importa `src/data/mock` ou `src/data/http`.** Importe `data` e os tipos de `@/data`.
2. **`src/domain` não importa** React, React Native, Expo, `@/data`, `@/features` nem `@/lib`. Funções puras, dados entrando por parâmetro.
3. **Implementações recebem suas dependências pela fábrica** (injeção por parâmetro):

```ts
createMockDataSource({ storage: AsyncStorage, latencyMs: 250 });
// futuro:
createHttpDataSource({ baseUrl, tokenStore: SecureStoreTokenStore, fetch });
```

   Nunca faça `import AsyncStorage` ou `import * as SecureStore` *dentro* do adaptador. Receba uma interface pequena (veja **I**) e monte a dependência concreta só em `src/data/index.ts`.
4. **Telas não chamam `data` diretamente.** Elas usam hooks de `features/*/api.ts`, e os hooks falam com o contrato.
5. **`components/ui` não conhece features nem dados.** Ele recebe tudo por props.

### Decisão consciente: singleton `data`

Os hooks importam o singleton `data` de `@/data` em vez de recebê-lo por React Context. Isso é um *service locator* de módulo, uma concessão pragmática: há um ponto único de troca (`src/data/index.ts`), e nos testes substituímos com `jest.mock('@/data')` (ver [09 · Testes](09-testes.md)). Se um dia for preciso trocar a fonte em tempo de execução ou ter duas fontes ao mesmo tempo, migre para `DataSourceProvider` + `useDataSource()`. **Não** crie um segundo singleton paralelo.

---

## Checklist: criando uma feature nova

Use como roteiro. Exemplo: feature `categories`.

1. **Domínio (S, D):** se houver regra de negócio, escreva o teste em `src/domain/__tests__/` e implemente uma função pura em `src/domain/` (um arquivo por assunto). Exporte em `src/domain/index.ts`.
2. **Contrato (I, L):** adicione uma sub-interface nomeada em `src/data/types.ts` (`CategoriesSource`) e pendure-a em `DataSource`. Documente o comportamento (ordenação, erros) em comentários: isso é o contrato.
3. **Implementação (D, L):** implemente no mock, **reutilizando funções de `src/domain`** em vez de reescrever regras. Teste os cenários do contrato. Atualize [04](04-camada-de-dados.md).
4. **Cache (O):** adicione as chaves em `queryKeys`, sem alterar as existentes.
5. **Hooks (S, D, I):** crie `src/features/categories/api.ts` com um hook por operação (`useCategories`, `useSaveCategory`…). Os hooks pedem só os parâmetros que usam, e cada mutation declara o que invalida (atualize a tabela em [01](01-arquitetura.md#cache-e-invalidação)).
6. **Validação (S):** crie um schema Zod em `src/features/categories/schemas.ts`.
7. **Componentes (S, I, O):** escolha o nível atômico e avalie o compound conforme [12](12-atomic-design-e-compound.md). Crie-os em `src/features/categories/components/`, um por tarefa de UI. Use mapas tipados para variações e passe props mínimas. Se for genérico e visual, ele vai para `src/components/ui/` e não pode conhecer a feature.
8. **Rotas (S, D):** crie arquivos finos em `src/app/` que compõem hooks e componentes. Nada de `data.*`, cálculo ou regra.
9. **Integração entre features:** importe de outra feature só `api.ts`/`hooks.ts`, nunca seus componentes internos.

## Checklist de PR (revisor)

- [ ] Algum arquivo ganhou um **segundo motivo para mudar**? (S)
- [ ] Algum `if`/ternário novo sobre variante, status ou tipo deveria ser um `Record<…>`? (O)
- [ ] Mudou o contrato `DataSource`? Os comentários e os testes de contrato foram atualizados? Os erros são `DataError`? (L)
- [ ] Funções, hooks e componentes recebem só o que usam (`Pick<>`, props mínimas)? (I)
- [ ] Algum import novo de `data/mock`, de `@/data` dentro de `src/domain`, ou de feature dentro de `components/ui`? (D)
- [ ] `npm run typecheck && npm run lint && npm test` passando.

---

## Débitos conhecidos

Nenhum no momento. Os débitos levantados na primeira análise foram resolvidos:

| Onde | Princípio | Como ficou |
|---|---|---|
| Validação de despesa/participante | S | `src/domain/validation.ts` (testado). O mock só traduz para `DataError` e checa posse |
| `ExpenseFormSheet` | S | Seleção de participantes extraída para `features/expenses/components/ParticipantPicker.tsx`, usando `useParticipantNames` |
| Rota do detalhe da despesa | S | Rota fina; UI e confirmação de exclusão em `features/expenses/components/ExpenseDetailSheet.tsx` |
| `Button` | O | Variantes num `Record<Variant, …>` |
| `StatusSelect` | O | Cores num `Record<ShareStatus, …>`; rótulos de `shareStatusLabel` (domínio) |
| Testes da fonte de dados | L | Suíte de contrato `src/test/data-source-contract.ts` |
| `DataSource` | I | Sub-interfaces nomeadas: `ActivitiesSource`, `ExpensesSource`, `ParticipantsSource`, `SummarySource` |
| `useSetShareStatus` | I | Recebe `Pick<Expense, 'id' \| 'activityId'>` |

Encontrou um desvio novo? Registre aqui com arquivo, princípio e o que fazer.
