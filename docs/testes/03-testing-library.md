# Testes · 03 · Referência da React Native Testing Library (v14)

← [09 · Testes](../09-testes.md) · Fontes: [testing-library.com, RNTL](https://testing-library.com/docs/react-native-testing-library/intro/) e a documentação atual em [oss.callstack.com/react-native-testing-library](https://oss.callstack.com/react-native-testing-library/) (v14).

> A página do testing-library.com é uma introdução antiga (2022). A referência atual é a da Callstack, e o pacote também traz a doc completa em `node_modules/@testing-library/react-native/docs/` (inclusive `guides/llm-guidelines.md`, para agentes).

A RNTL renderiza componentes React Native em memória (via `test-renderer`, sem simulador) e oferece **queries** e **interações** que imitam o usuário.

## ⚠️ v14: tudo é assíncrono

Na v14, **`render`, `renderHook`, `fireEvent.*`, `rerender`, `unmount` e `act` retornam Promise**. Sempre use `await`, e todo teste é `async`.

```tsx
it('…', async () => {
  await render(<Componente />);
  await fireEvent.press(screen.getByText('Ok'));
});
```

Outras mudanças em relação a tutoriais antigos (v12/v13):

| Antes | v14 |
|---|---|
| `react-test-renderer` | `test-renderer` |
| `ReactTestInstance` | `TestInstance` (de `test-renderer`) |
| `renderAsync`, `fireEventAsync` | `render`, `fireEvent` |
| `update()` | `rerender()` |
| `getQueriesForElement` | `within` |
| `UNSAFE_getByType`, `UNSAFE_root` | Queries de host (`getByRole`…), `screen.root`, `screen.container` |
| `@testing-library/jest-native` | Matchers embutidos (automáticos) |

## render e screen

```tsx
import { render, screen } from '@testing-library/react-native';

await render(<StatusSelect value="pending" onChange={jest.fn()} />);
screen.getByRole('radio', { name: 'Pago' });
```

- **Use `screen`** em vez de desestruturar o retorno de `render`.
- Opção `wrapper`: componente com os providers. No projeto, use `renderWithProviders` ([Setup](01-setup.md)).
- `screen.debug()` imprime a árvore renderizada, útil quando uma query falha.
- A limpeza (unmount) entre testes é **automática**. Não chame `cleanup()`.

## Queries

### Variantes

| Variante | Se não achar | Se achar vários | Async | Use para |
|---|---|---|---|---|
| `getBy*` | lança erro | lança erro | não | elemento que **deve** estar na tela |
| `getAllBy*` | lança erro | retorna array | não | listas |
| `queryBy*` | `null` | lança erro | não | **somente** verificar ausência |
| `queryAllBy*` | `[]` | array | não | contar ausência/presença |
| `findBy*` | rejeita (após 1000 ms) | rejeita | **sim** | elemento que **vai aparecer** (após carregar dados) |
| `findAllBy*` | rejeita | array | **sim** | lista que vai aparecer |

### Predicados, em ordem de prioridade

1. **`ByRole(role, { name, disabled, selected, checked, expanded, busy })`**: primeira escolha. O elemento precisa ser acessível (`Pressable` com `accessibilityRole`, `Text`, `TextInput`, `Switch`; uma `View` precisa de `accessible`).
2. **`ByLabelText`**: `accessibilityLabel`/`aria-label` (botões só de ícone).
3. **`ByPlaceholderText`**: inputs (`'Título'`, `'E-mail'`).
4. **`ByText`**: texto visível. Junta `<Text>` irmãos adjacentes.
5. **`ByDisplayValue`**: valor atual de um `TextInput`.
6. **`ByHintText`**: `accessibilityHint`.
7. **`ByTestId`**: **último recurso**. O usuário não vê `testID`.

Aceitam string (match exato) ou RegExp (`/férias/i`), e `{ exact: false }` para match parcial.

### Como os componentes do projeto aparecem nas queries

| Componente | Query |
|---|---|
| `Button label="Salvar"` | `getByRole('button', { name: 'Salvar' })` |
| `Button icon={Trash2} accessibilityLabel="Excluir"` | `getByRole('button', { name: 'Excluir' })` |
| `Fab label="Criar"` | `getByRole('button', { name: 'Criar' })` |
| `StatusSelect` | `getByRole('radio', { name: 'Pago' })` + `toBeSelected()` |
| `Input placeholder="Título"` | `getByPlaceholderText('Título')` |
| `EmptyState message="…"` | `getByText('…')` |
| `Text` | `getByText('Férias de verão')` |

> Se um elemento interativo não é encontrável por `ByRole`/`ByLabelText`, provavelmente **falta acessibilidade no componente**. Corrija o componente (adicione `accessibilityRole`/`accessibilityLabel`) em vez de usar `testID`.

## Interações: `userEvent`, preferido

```tsx
import { userEvent } from '@testing-library/react-native';

const user = userEvent.setup();         // um por teste
await user.press(button);               // pressIn → pressOut → press
await user.longPress(item, { duration: 800 });
await user.type(input, 'Férias');       // caractere a caractere; ACRESCENTA ao texto atual
await user.clear(input);                // limpa antes de digitar um novo valor
await user.paste(input, '1.234,56');
await user.type(input, 'Ana', { submitEditing: true }); // + Enter (onSubmitEditing)
await user.scrollTo(list, { y: 300 });
```

- `type`, `clear` e `paste` só funcionam em `TextInput`, e `scrollTo` em `ScrollView`/`FlatList`.
- Respeita `disabled`: um `press` num botão desabilitado não chama `onPress`.

### `fireEvent`: baixo nível

```tsx
await fireEvent.press(el);
await fireEvent.changeText(input, 'texto');
await fireEvent(el, 'onLayout', { nativeEvent: { layout: { width: 300 } } });
```

Use só quando o `userEvent` não cobre o evento. Na v14, o handler recebe um evento nativo padrão. Para verificar o argumento, use `expect.objectContaining`.

## Matchers embutidos

São ativados automaticamente ao importar `@testing-library/react-native`.

| Matcher | Verifica |
|---|---|
| `toBeOnTheScreen()` | Elemento presente |
| `toBeVisible()` | Visível (estilo, `aria-hidden`, ancestrais) |
| `toBeEmptyElement()` | Sem filhos |
| `toContainElement(el)` | Contém outro elemento |
| `toHaveTextContent(texto \| regex)` | Texto do elemento |
| `toHaveDisplayValue(valor)` | Valor de `TextInput` |
| `toBeEnabled()` / `toBeDisabled()` | Estado de desabilitado (inclui ancestrais) |
| `toBeSelected()` | `accessibilityState.selected` |
| `toBeChecked()` / `toBePartiallyChecked()` | Checkbox/switch |
| `toBeExpanded()` / `toBeCollapsed()` | Expansível |
| `toBeBusy()` | Carregando |
| `toHaveAccessibleName(nome)` | Nome acessível |
| `toHaveAccessibilityValue({ min, max, now, text })` | Valor acessível |
| `toHaveStyle(estilo)` | Estilo, só quando o estilo **é** o comportamento |
| `toHaveProp(nome, valor?)` | Prop. Evite: prefira os matchers semânticos |

```tsx
expect(screen.getByText('Férias')).toBeOnTheScreen();
expect(screen.queryByText('Carregando')).not.toBeOnTheScreen();  // ausência: queryBy + not
expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
```

## Utilitários assíncronos

```tsx
// Elemento que aparece depois → findBy
expect(await screen.findByText('Férias de verão')).toBeOnTheScreen();

// Condição que não é "elemento aparecer" → waitFor
await waitFor(() => expect(result.current.isSuccess).toBe(true));

// Esperar sumir (o elemento precisa existir no momento da chamada)
await waitForElementToBeRemoved(() => screen.getByText('Salvando…'));
```

As regras do `waitFor` (padrões: `timeout` 1000 ms, `interval` 50 ms):

- **Sem efeitos colaterais dentro**: o callback roda várias vezes. Pressione/digite **antes**.
- **Uma asserção por `waitFor`**. As seguintes vão depois, fora dele.
- **Nunca com callback vazio.**
- Prefira `findBy*` a `waitFor(() => getBy*)`.

### Timers falsos

Com `jest.useFakeTimers()`, o `waitFor` avança o relógio sozinho e o `userEvent.setup()` funciona com timers reais e falsos sem configuração extra. Um `press` leva no mínimo ~130 ms de tempo simulado, e timers falsos deixam suítes grandes mais rápidas.

## `act`

`render`, `renderHook`, `fireEvent`, `userEvent` e `waitFor` **já envolvem `act`**. Só use `act` manualmente para disparar atualizações fora deles, como chamar `mutateAsync` de um hook. Mesmo nesse caso, use `await`:

```tsx
await act(() => result.current.save.mutateAsync(input));
```

Se aparecer o aviso *"An update … was not wrapped in act(…)"*, quase sempre falta um `await` ou um `findBy`/`waitFor` para esperar o efeito terminar.

## renderHook

```tsx
const { result, rerender, unmount } = await renderHook(() => useActivities(), {
  wrapper: AppProviders,
  // initialProps: { id: '1' },
});
await waitFor(() => expect(result.current.isSuccess).toBe(true));
result.current.data;
```

No projeto, use `renderHookWithProviders` ([Setup](01-setup.md)).

## Expo Router: `expo-router/testing-library`

Para testar **navegação, redirects e guards** com o router de verdade:

```tsx
import { renderRouter, testRouter } from 'expo-router/testing-library';

await renderRouter(
  { index: Index, '(auth)/sign-in': () => <Text>login</Text> }, // "sistema de arquivos" em memória
  { initialUrl: '/' },
);
expect(screen).toHavePathname('/sign-in');

await testRouter.push('/activities');
```

- As chaves são caminhos de rota sem `/` inicial nem extensão. Também aceita array de nomes (componentes nulos) ou o caminho de uma pasta de fixture.
- Matchers: `toHavePathname`, `toHavePathnameWithParams`, `toHaveSegments`, `toHaveSearchParams`, `toHaveRouterState`.
- `testRouter`: `navigate`, `push`, `replace`, `back`, `setParams` e `dismissAll` são todos assíncronos (use `await`). `canGoBack()` é síncrono.
- Exige RNTL ≥ 14.

Para testar uma **tela isolada** (sem o router), faça um mock parcial de `expo-router` e verifique as chamadas de `router.push` ([Receitas](04-receitas.md#tela-com-navegação-mockada)).

## Erros comuns (resumo do guia oficial)

| ❌ Evite | ✅ Faça |
|---|---|
| `getByTestId` quando há texto/papel | `getByRole('button', { name })` |
| `expect(btn.props.accessibilityState.disabled).toBe(true)` | `expect(btn).toBeDisabled()` |
| `expect(queryByText('x')).toBeTruthy()` | `expect(getByText('x')).toBeOnTheScreen()` |
| `expect(getByText('x')).not.toBeNull()` | `getBy` já lança erro: use `toBeOnTheScreen()` |
| `waitFor(() => getByText('x'))` | `await findByText('x')` |
| `waitFor(() => { fireEvent.press(b); expect(…) })` | `press` fora, `waitFor` só com a asserção |
| `const { getByText } = render(…)` | `screen.getByText` |
| `act(() => fireEvent.press(b))` | `await fireEvent.press(b)` (ou `user.press`) |
| `fireEvent` para tudo | `userEvent` |
| Esquecer `await` no `render` (v14) | `await render(…)` |
| Chamar `cleanup()` | Automático |
| Wrapper chamado `Wrapper` | Nome descritivo: `AppProviders` |
