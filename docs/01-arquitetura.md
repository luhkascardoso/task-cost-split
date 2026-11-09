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
  src/components/ui/  Design system em níveis atômicos (consome só src/theme)
  src/theme/          Tokens do Figma
  src/lib/            QueryClient, datas
```

**Regra de dependência:** as setas só apontam para baixo. `domain/` não importa nada do app. `components/ui/` não conhece features. As features podem importar umas das outras só via `api.ts`/`hooks.ts`, nunca componentes internos. **Nenhum arquivo fora de `src/data/` conhece uma implementação concreta de dados.**

## Princípios de engenharia

Critérios para desempatar decisões de projeto e de code review:

1. **Resiliência:** o app não quebra quando os dados vêm errados ou a rede cai. Erro vira mensagem amigável ([04 · Erros](04-camada-de-dados.md#erros)), não tela branca.
2. **Clareza de estado:** o usuário nunca fica em dúvida se uma operação concluiu. Nada de toque duplicado nem de falha silenciosa ([05 · Dinheiro e duplicidade](05-regras-de-negocio.md#dinheiro-e-duplicidade)).
3. **O aparelho não é cofre:** guardar localmente só o necessário. Token de sessão vai para `expo-secure-store`, nunca para o AsyncStorage, e nada sensível vai para log.
4. **Regras de negócio num lugar só:** em `src/domain` hoje, no backend quando ele existir. A UI não recalcula dinheiro.
5. **Cliente no centro:** acessibilidade é requisito, não polimento ([12 · Acessibilidade](12-atomic-design-e-compound.md#acessibilidade)).
6. **IA validada por gente:** código, testes e reviews gerados por IA passam por revisão humana ([13 · IA no desenvolvimento](13-ia-no-desenvolvimento.md)).

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
│   ├── ui/                       # Design system (Atomic Design, ver docs/12)
│   │   ├── atoms/                # Text, Button, Input, Card, Avatar, StatusBadge, Logo
│   │   ├── molecules/            # AvatarGroup, EmptyState, Fab, SegmentedControl, StatusSelect
│   │   ├── organisms/            # TabHeader
│   │   ├── templates/            # Screen, Sheet (compound)
│   │   └── index.ts              # Barrel único: importe sempre de @/components/ui
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
               └─ mock: getExpenseInputError + buildShares(...) do domínio e grava no AsyncStorage
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

### Regras de cache

- **Query ou mutation se escolhe pelo efeito**, não pelo verbo HTTP: leitura repetível e segura para refazer é query; o que cria, altera ou remove estado é mutation.
- **A chave identifica os dados.** Todo parâmetro que muda o resultado entra na `queryKey` (ex.: `activityId` em `expenses.byActivity`). Se faltar, duas telas diferentes leem a mesma entrada de cache. Use sempre as fábricas de `queryKeys`, com valores estáveis e serializáveis.
- **Nada sensível na chave:** senha, token ou dado pessoal nunca entram em `queryKey`.
- **`staleTime` ≠ `gcTime`:** `staleTime` (30 s aqui) diz por quanto tempo o dado é considerado fresco; `gcTime` (padrão de 5 min) diz por quanto tempo uma query sem uso fica em memória. O cache é só em memória; ele **não** é persistido.
- **Trocar de usuário limpa o cache:** `signOut()` chama `queryClient.clear()`, então o próximo login não vê dados do anterior.
- **Retry:** queries repetem só falhas transitórias; mutations nunca (ver [04 · Erros](04-camada-de-dados.md#erros)).
