# 01 · Arquitetura

## Visão geral

```
┌──────────────────────────────────────────────────────────────┐
│  src/app/            ROTAS (Expo Router): telas finas         │
│     │  compõem componentes e chamam hooks de feature          │
│     ▼                                                         │
│  src/features/*/     FEATURES: api.ts (React Query),          │
│     │                schemas.ts (Zod), components/            │
│     ▼                                                         │
│  src/data/           CAMADA DE DADOS: interface DataSource +  │
│     │                implementações (mock hoje, http depois)  │
│     ▼                                                         │
│  src/domain/         DOMÍNIO PURO: divisão, status, resumo,   │
│                      dinheiro. Sem React, sem rede. 100% teste│
└──────────────────────────────────────────────────────────────┘
  src/components/ui/  Design system (consome só src/theme)
  src/theme/          Tokens do Figma
  src/lib/            QueryClient, datas
```

**Regra de dependência:** as setas só apontam para baixo. `domain/` não importa nada do app. `components/ui/` não conhece features. As features podem importar umas das outras só via `api.ts`/`hooks.ts`, nunca componentes internos. **Nenhum arquivo fora de `src/data/` conhece uma implementação concreta de dados.**

## Estrutura de pastas

```
src/
├── app/                          # Cada arquivo = uma rota
│   ├── _layout.tsx               # Providers, fontes, splash, guarda de auth
│   ├── index.tsx                 # "/" → redireciona p/ /sign-in ou /activities
│   ├── (auth)/                   # Visível só deslogado
│   │   ├── sign-in.tsx           # Login
│   │   └── sign-up.tsx           # Cadastro
│   └── (app)/                    # Visível só logado
│       ├── _layout.tsx           # Stack + definição dos form sheets
│       ├── (tabs)/               # Bottom navigation
│       │   ├── activities.tsx    # Atividades
│       │   ├── summary.tsx       # Resumo
│       │   └── participants.tsx  # Participantes
│       └── activity/
│           ├── new.tsx                              # sheet
│           └── [activityId]/
│               ├── index.tsx                        # Detalhe da atividade
│               ├── edit.tsx                         # sheet
│               └── expense/
│                   ├── new.tsx                      # sheet
│                   └── [expenseId]/
│                       ├── index.tsx                # sheet: detalhe/pagamentos
│                       └── edit.tsx                 # sheet
├── components/
│   ├── ui/                       # Button, Input, Card, Avatar, Badge, StatusSelect…
│   └── form/                     # Integrações com react-hook-form
├── features/
│   ├── auth/                     # sessão (zustand), login/cadastro
│   ├── activities/
│   ├── expenses/
│   ├── participants/
│   └── summary/
├── data/                         # Contrato DataSource + implementações
│   ├── types.ts                  # A interface (contrato com o futuro backend)
│   ├── index.ts                  # Escolhe a implementação (EXPO_PUBLIC_DATA_SOURCE)
│   └── mock/                     # Implementação local (AsyncStorage)
├── domain/                       # Regras de negócio puras + testes
├── lib/                          # query-client, date
└── theme/                        # tokens.ts
```

## Decisões técnicas

| Decisão | Escolha | Por quê |
|---|---|---|
| Framework | **Expo (managed + CNG)** | Sem pastas `ios/` e `android/` versionadas. Builds via EAS. |
| Navegação | **Expo Router** (file-based) | Deep links e typed routes de graça. `Stack.Protected` faz a guarda de auth. |
| Modais/sheets | **Rotas `formSheet` nativas** | Sheets do Figma (Nova atividade, Nova despesa, Detalhe) viram rotas. Sem lib de bottom sheet e sem estado global de modal. Dá para fazer deep link de cada sheet. |
| Dados | **Interface `DataSource`** + implementação **mock** local | O backend próprio ainda não existe. O app roda inteiro com o mock e o backend entra depois sem mexer nas telas. Ver [04](04-camada-de-dados.md). |
| Estado do servidor | **TanStack Query** | Cache, loading/erro, invalidação e update otimista (status de pagamento). |
| Estado do cliente | **Zustand**, só para a sessão | Todo o resto vem do servidor. Não crie stores globais para dados do banco. |
| Formulários | **React Hook Form + Zod** | Validação tipada. O schema é a fonte da verdade do formulário. |
| Ícones | **lucide-react-native** | Mesmo estilo de traço dos ícones do Figma. |
| Fontes | **Inter + Sora** via `@expo-google-fonts` | Exatamente as fontes das variáveis do Figma. |
| Dinheiro | **Inteiros em centavos** | Evita erros de ponto flutuante. Ver [05](05-regras-de-negocio.md). |

## Fluxo de dados (exemplo: criar despesa)

```
ExpenseFormSheet (UI)
  └─ useForm + zod valida {title, amount(cents), participantIds}
      └─ useSaveExpense().mutateAsync(values)          features/expenses/api.ts
          └─ data.expenses.create(activityId, input)    src/data (contrato)
               └─ mock: buildShares(...) do domínio e grava no AsyncStorage
                  (futuro http: POST no backend, que divide e grava)
          └─ onSuccess → invalida queries:
               expenses(activity) · activities · summary · participants
                 └─ telas abertas refazem o fetch automaticamente
```

## Autenticação

1. `restoreSession()` (root layout) chama `data.auth.getSession()` para restaurar o login salvo.
2. `useSessionStore` expõe `{ session, initialized }`. `useSignIn`, `useSignUp` e `signOut` atualizam o store.
3. O root layout segura a splash até `initialized && fontsLoaded`.
4. `Stack.Protected guard={isLoggedIn}` mostra `(app)` ou `(auth)`. Login e logout trocam de grupo sozinhos, sem `router.replace` manual.
5. No cadastro, a fonte de dados cria o participante **"eu"** (`isSelf: true`).

> A guarda de rotas é só de UX. Quando houver backend, quem protege os dados é ele (escopo por usuário em toda operação).

## Cache e invalidação

As chaves ficam centralizadas em `src/lib/query-client.ts` (`queryKeys`). Toda mutation invalida o que afeta:

| Mutation | Invalida |
|---|---|
| salvar/excluir atividade | `activities`, `summary`, `participants` |
| salvar/excluir despesa, mudar status | `expenses(activity)`, `expenses`, `activities`, `summary`, `participants` |
| criar participante | `participants` |
