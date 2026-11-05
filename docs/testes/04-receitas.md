# Testes · 04 · Receitas

← [09 · Testes](../09-testes.md)

Modelos prontos, um por camada. Os de 3 a 7 usam a infraestrutura do [Setup](01-setup.md) (já configurada: `jest.setup.ts` + `src/test/`). Todos foram executados com sucesso numa cópia do projeto.

## 1. Regra de domínio (já existe)

`src/domain/__tests__/domain.test.ts`: funções puras, sem setup nenhum.

```ts
import { splitEvenly } from '..';

it('divide igualmente e distribui o resto', () => {
  const r = splitEvenly(10000, ['a', 'b', 'c']);
  expect([...r.values()]).toEqual([3334, 3333, 3333]);
});
```

Prefira `it.each` para tabelas de casos ([02 · Jest](02-jest.md#estrutura)).

## 2. Contrato da fonte de dados (já existe)

`src/data/__tests__/mock-data-source.test.ts`: cria um `DataSource` com storage em memória e `latencyMs: 0`, e exercita os cenários do contrato ([04 · Camada de dados](../04-camada-de-dados.md)).

```ts
await expect(ds.activities.list()).rejects.toMatchObject({ code: 'unauthorized' });
```

> Quando o adaptador HTTP existir, extraia esses cenários para uma função `describeDataSourceContract(createDs)` e rode-a contra as duas implementações.

## 3. Componente de UI

`src/components/ui/__tests__/StatusSelect.test.tsx`

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import { StatusSelect } from '../StatusSelect';

describe('StatusSelect', () => {
  it('marca a opção atual como selecionada', async () => {
    await render(<StatusSelect value="pending" onChange={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Pendente' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Pago' })).not.toBeSelected();
  });

  it('chama onChange ao escolher outra opção', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<StatusSelect value="pending" onChange={onChange} />);

    await user.press(screen.getByRole('radio', { name: 'Pago' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('paid');
  });

  it('não chama onChange ao tocar na opção já selecionada', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<StatusSelect value="paid" onChange={onChange} />);

    await user.press(screen.getByRole('radio', { name: 'Pago' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('fica desabilitado quando disabled', async () => {
    await render(<StatusSelect value="pending" onChange={jest.fn()} disabled />);

    expect(screen.getByRole('radio', { name: 'Pago' })).toBeDisabled();
  });
});
```

`src/components/ui/__tests__/Button.test.tsx`: estados e botão só de ícone.

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { Trash2 } from 'lucide-react-native';

import { Button } from '../Button';

it('não dispara onPress enquanto loading', async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(<Button label="Salvar" loading onPress={onPress} />);

  const button = screen.getByRole('button');
  expect(button).toBeDisabled();
  await user.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

it('botão só de ícone é encontrado pelo accessibilityLabel', async () => {
  await render(<Button icon={Trash2} variant="danger" accessibilityLabel="Excluir" onPress={jest.fn()} />);

  expect(screen.getByRole('button', { name: 'Excluir' })).toBeOnTheScreen();
});
```

## 4. Hook de feature (React Query)

`src/features/activities/__tests__/api.test.tsx`

```tsx
import { act, waitFor } from '@testing-library/react-native';

import { getSelfParticipant, signInTestUser } from '@/test/fixtures';
import { renderHookWithProviders } from '@/test/render';
import { testData } from '@/test/test-data';
import { useActivities, useSaveActivity } from '../api';

describe('activities api (hooks)', () => {
  beforeEach(async () => {
    await signInTestUser();
  });

  it('useActivities lista atividades com totais', async () => {
    const me = await getSelfParticipant();
    const activity = await testData.activities.create({ title: 'Férias', date: '2025-12-20' });
    await testData.expenses.create(activity.id, { title: 'Casa', amount: 50000, participantIds: [me.id] });

    const { result } = await renderHookWithProviders(() => useActivities());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      expect.objectContaining({ title: 'Férias', total: 50000, expensesCount: 1 }),
    ]);
  });

  it('useSaveActivity cria e invalida a lista', async () => {
    const { result } = await renderHookWithProviders(() => ({
      list: useActivities(),
      save: useSaveActivity(),
    }));
    await waitFor(() => expect(result.current.list.data).toEqual([]));

    await act(() => result.current.save.mutateAsync({ title: 'Jantar', date: '15/10/25' }));

    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    expect(result.current.list.data?.[0]).toMatchObject({ title: 'Jantar', date: '2025-10-15' });
  });
});
```

- Prepare os dados **direto no `testData`** (mais rápido e claro do que via UI).
- Testar `list` + `save` no mesmo hook prova a **invalidação** do cache.
- Também vale testar: `useSetShareStatus` (otimista: o status muda antes da resposta) e mutations com erro (`DataError` em `result.current.error`).

## 5. Tela com navegação mockada

`src/features/activities/__tests__/ActivitiesScreen.test.tsx`. O teste fica no `__tests__` da feature, **não** em `src/app/`.

```tsx
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ActivitiesScreen from '@/app/(app)/(tabs)/activities';
import { signInTestUser } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { testData } from '@/test/test-data';

// Mock parcial: mantém o resto do expo-router e troca só o objeto `router`.
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

describe('<ActivitiesScreen />', () => {
  beforeEach(async () => {
    await signInTestUser();
  });

  it('mostra o estado vazio', async () => {
    await renderWithProviders(<ActivitiesScreen />);

    expect(await screen.findByText('Você ainda não tem atividades criadas')).toBeOnTheScreen();
  });

  it('lista as atividades do usuário', async () => {
    await testData.activities.create({ title: 'Férias de verão', date: '2025-12-20' });

    await renderWithProviders(<ActivitiesScreen />);

    expect(await screen.findByText('Férias de verão')).toBeOnTheScreen();
    expect(screen.getByText('20/12/25')).toBeOnTheScreen();
    expect(screen.queryByText('Você ainda não tem atividades criadas')).not.toBeOnTheScreen();
  });

  it('"Criar" abre o sheet de nova atividade', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ActivitiesScreen />);

    await user.press(await screen.findByRole('button', { name: 'Criar' }));

    expect(router.push).toHaveBeenCalledWith('/activity/new');
  });
});
```

Para telas com parâmetros (`useLocalSearchParams`), inclua no mock parcial `useLocalSearchParams: () => ({ activityId: 'x' })`, ou use `renderRouter` (receita 7) com `initialUrl`.

## 6. Formulário (padrão a seguir)

Para `ActivityFormSheet`, `ExpenseFormSheet` e as telas de login e cadastro. É a mesma base da receita 5 (mock de `router`, `renderWithProviders`):

```tsx
it('valida campos obrigatórios', async () => {
  const user = userEvent.setup();
  await renderWithProviders(<ActivityFormSheet />);

  await user.clear(screen.getByPlaceholderText('Data (dd/mm/aa)'));
  await user.press(screen.getByRole('button', { name: 'Salvar' }));

  expect(await screen.findByText('Informe um título')).toBeOnTheScreen();
  expect(await testData.activities.list()).toEqual([]);   // nada foi gravado
});

it('salva e navega para a atividade criada', async () => {
  const user = userEvent.setup();
  await renderWithProviders(<ActivityFormSheet />);

  await user.type(screen.getByPlaceholderText('Título'), 'Férias');
  await user.press(screen.getByRole('button', { name: 'Salvar' }));

  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  expect(await testData.activities.list()).toEqual([expect.objectContaining({ title: 'Férias' })]);
});
```

> Esta receita é um **padrão**: os nomes de botões e placeholders vêm do código atual, mas este arquivo específico não foi executado na validação. Confira os textos ao implementar.

Pontos de atenção:
- `user.type` **acrescenta** ao texto. Para trocar o valor, faça `user.clear` antes (o campo de data já vem preenchido com hoje).
- O input de valor (`R$`) usa máscara "centavos primeiro": digitar `"12345"` resulta em `123,45`. Verifique com `toHaveDisplayValue('123,45')`.
- Mensagens de erro vêm dos schemas Zod (`features/*/schemas.ts`). Teste pelo texto.

## 7. Navegação e guards (`renderRouter`)

`src/__tests__/routing.test.tsx`: testa o redirect de `src/app/index.tsx` com o router real.

```tsx
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import Index from '@/app/index';
import { signInTestUser } from '@/test/fixtures';

// Rotas "falsas" para isolar a lógica do redirect de src/app/index.tsx.
const routes = {
  index: Index,
  '(auth)/sign-in': () => <Text>tela de login</Text>,
  '(app)/(tabs)/activities': () => <Text>tela de atividades</Text>,
};

describe('rota "/"', () => {
  it('deslogado → /sign-in', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    expect(screen).toHavePathname('/sign-in');
    expect(screen.getByText('tela de login')).toBeOnTheScreen();
  });

  it('logado → /activities', async () => {
    await signInTestUser();
    await renderRouter(routes, { initialUrl: '/' });

    expect(screen).toHavePathname('/activities');
  });
});
```

Esse teste teria pego o bug do "Unmatched Route" corrigido anteriormente.

## Backlog sugerido (ordem)

1. ~~Setup~~ ✅. Comece pelas receitas 3, 5 e 7.
2. `StatusSelect`, `Button`, `Input` (erro exibido), `StatusBadge` (rótulo por status).
3. Hooks: `useSaveExpense`, `useSetShareStatus` (otimista), `useDeleteActivity`.
4. Formulários: login/cadastro (erro de credencial do `DataError`), `ActivityFormSheet`, `ExpenseFormSheet` (seleção de participantes, máscara de valor).
5. Telas: Resumo (vazio × com dados), Participantes (oculta o "eu"), Detalhe da atividade.
6. Navegação: guard de auth (logado não vê `/sign-in`; deslogado não vê `/activities`).
