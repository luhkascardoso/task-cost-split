# Testes · 01 · Setup

← [09 · Testes](../09-testes.md)

> ✅ **Aplicado no projeto em 02/11/2026.** Esta página documenta o que está configurado e serve de referência caso precise refazer.

## O que está instalado

- `jest` 30.5, `jest-expo` 58, `@types/jest`
- `@testing-library/react-native` 14.1, `test-renderer` 1.3.1, `@react-native/jest-preset` 0.88.1
- `tsconfig.json` → `"types": ["jest"]`, para os globais `describe`/`it`/`expect` no TypeScript
- Scripts: `test`, `test:watch` e `test:coverage`

## Passo 1: dependências

```bash
npm install -D @testing-library/react-native@^14.1.0 test-renderer@~1.3.1 @react-native/jest-preset@^0.88.1
```

| Pacote | Por quê |
|---|---|
| `@testing-library/react-native` **14.x** | Exige React ≥ 19 e RN ≥ 0.78. O `expo-router/testing-library` exige RNTL ≥ 14. |
| `test-renderer` **1.3.x** | Peer dependency da RNTL v14, no lugar do `react-test-renderer` (descontinuado e incompatível com React 19). A linha precisa corresponder ao *minor* do React: 1.0 → 19.0, 1.1 → 19.1, 1.2 → 19.2, **1.3 → 19.3** (o nosso). |
| `@react-native/jest-preset` **0.88.x** | O `jest-expo` 58 pede `^0.88.1` (mesma versão do RN). Antes estava o 0.86.3. |

> Não instale `react-test-renderer` nem `@testing-library/jest-native`. Os matchers já vêm na RNTL.
>
> Para ESLint nos testes (opcional), o pacote é `eslint-plugin-testing-library`, com a config `flat/react` restrita a `**/__tests__/**`.

## Passo 2: configuração do Jest (`package.json`)

```json
"jest": {
  "preset": "jest-expo",
  "testPathIgnorePatterns": ["/node_modules/", "/.expo/"],
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
  "moduleNameMapper": {
    "^lucide-react-native$": "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js"
  },
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/test/**",
    "!src/app/**/_layout.tsx"
  ]
}
```

- **`moduleNameMapper` do lucide:** é obrigatório. O preset resolve o pacote pela condição `react-native` do `exports`, que aponta para um `.mjs` (ESM), e o Jest falha com *"Must use import to load ES Module"*. O mapeamento aponta para o build CommonJS que o próprio pacote publica.
- **Alias `@/`:** já funciona no Jest via `babel-preset-expo` (lê o `paths` do `tsconfig.json`). Não precisa de `moduleNameMapper` para ele.
- `coverage/` já está no `.gitignore`.

## Passo 3: arquivos de suporte

Toda a infraestrutura gira em torno da **fonte de dados mock** ([04 · Camada de dados](../04-camada-de-dados.md)). Nos testes, o app inteiro usa o mock **em memória e sem latência**, e a cada teste começa com o "banco" vazio.

### `jest.setup.ts` (raiz)

```ts
import { queryClient } from '@/lib/query-client';
import { useSessionStore } from '@/features/auth/session-store';
import { resetTestData } from '@/test/test-data';

// 1) Toda a app usa a fonte de dados mock em memória, sem latência.
jest.mock('@/data', () => ({
  ...jest.requireActual('@/data/types'),
  data: jest.requireActual('@/test/test-data').testData,
}));

// 2) Sem retries (erros aparecem na hora) e sem timers de garbage collection do cache.
queryClient.setDefaultOptions({
  queries: { retry: false, gcTime: Infinity },
  mutations: { retry: false },
});

// 3) Estado limpo antes de cada teste: "banco", cache do React Query e sessão.
beforeEach(() => {
  resetTestData();
  queryClient.clear();
  useSessionStore.setState({ session: null, initialized: true });
});

afterAll(() => {
  queryClient.clear();
});
```

### `src/test/test-data.ts`

```ts
import { createMockDataSource, type KeyValueStorage } from '@/data/mock/mock-data-source';
import type { DataSource } from '@/data/types';

/** Storage em memória — cada reset começa com o "banco" vazio. */
function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
  };
}

let current: DataSource = createMockDataSource({ storage: memoryStorage(), latencyMs: 0 });

/** Recria a fonte de dados (chamado no beforeEach global do jest.setup.ts). */
export function resetTestData(): DataSource {
  current = createMockDataSource({ storage: memoryStorage(), latencyMs: 0 });
  return current;
}

/**
 * Referência estável usada no lugar de `data` (via jest.mock('@/data') no jest.setup.ts).
 * O app importa `data` uma vez; o Proxy delega para a instância atual, que muda a cada teste.
 */
export const testData = new Proxy({} as DataSource, {
  get: (_target, key) => current[key as keyof DataSource],
});
```

### `src/test/fixtures.ts`

```ts
import type { Session } from '@/data';
import { setSession } from '@/features/auth/session-store';
import { testData } from './test-data';

/** Cria um usuário na fonte de dados de teste e o deixa logado no app. */
export async function signInTestUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<Session> {
  const session = await testData.auth.signUp({
    name: 'Lucas Teste',
    email: 'lucas@teste.com',
    password: '123456',
    ...overrides,
  });
  setSession(session);
  return session;
}

/** Retorna o participante "eu" do usuário logado. */
export async function getSelfParticipant() {
  const participants = await testData.participants.list();
  return participants.find((p) => p.isSelf)!;
}
```

### `src/test/render.tsx`

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query-client';

/** Métricas fixas: sem isso o SafeAreaProvider não renderiza os filhos no Jest. */
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Todos os providers que o app monta no root layout (exceto navegação). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={initialMetrics}>{children}</SafeAreaProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: AppProviders });
}

export function renderHookWithProviders<T>(hook: () => T) {
  return renderHook(hook, { wrapper: AppProviders });
}
```

## Por que usar o `queryClient` global nos testes?

Os hooks das features invalidam o cache pelo `queryClient` importado de `@/lib/query-client`, e não por `useQueryClient()`. Por isso os testes precisam usar **o mesmo** client, limpo a cada teste com `queryClient.clear()`. Se no futuro os hooks passarem a usar `useQueryClient()`, dá para criar um client novo por teste, que é o padrão recomendado pelo TanStack Query.

## Problemas conhecidos

| Sintoma | Causa e solução |
|---|---|
| `Must use import to load ES Module … lucide-react-native.mjs` | Falta o `moduleNameMapper` do lucide (passo 2). |
| `ERESOLVE … react-test-renderer` | Instalou a RNTL v13 ou o `react-test-renderer`. Use RNTL 14 + `test-renderer`. |
| `peer @react-native/jest-preset@^0.88.1` | Atualize o preset para 0.88 (passo 1). |
| `A worker process has failed to exit gracefully` | Apareceu na validação inicial com testes de tela e de hooks (receitas 4 e 5), mas não com a suíte atual. Se voltar, investigue com `npx jest --detectOpenHandles <arquivo>`. Os testes passam mesmo assim. |
| Typecheck reclama de `describe`/`it` | `"types": ["jest"]` no `tsconfig.json` (já configurado). |
| Strings fora de `<Text>` lançam erro | Comportamento padrão da v14. Sempre envolva textos em `<Text>`. |
