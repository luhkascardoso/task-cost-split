# Testes · 02 · Referência do Jest

← [09 · Testes](../09-testes.md) · Fonte: [jestjs.io/pt-BR](https://jestjs.io/pt-BR/) (versão 30.5)

O Jest é o **executor** de testes: encontra os arquivos, roda cada um isolado (em paralelo) e fornece `describe`/`it`/`expect`, os mocks e os timers falsos. A RNTL ([03](03-testing-library.md)) roda em cima dele.

## Estrutura

```ts
describe('splitEvenly', () => {          // agrupa testes relacionados
  it('distribui o resto aos primeiros', () => {   // `test` é sinônimo de `it`
    expect(...).toEqual(...);
  });
});
```

- `it.only(...)` roda só esse teste (útil para isolar uma falha; **nunca commite**).
- `it.skip(...)` pula. `it.todo('…')` marca um teste a escrever.
- `it.each([...])('caso %s', (input, esperado) => …)` cria uma tabela de casos, ótimo para regras de domínio.

```ts
it.each([
  [[], 'pending'],
  [[{ status: 'paid' }, { status: 'pending' }], 'partial'],
  [[{ status: 'paid' }], 'paid'],
] as const)('status de %j é %s', (shares, expected) => {
  expect(getExpenseStatus(shares)).toBe(expected);
});
```

## Matchers essenciais

| Matcher | Quando usar |
|---|---|
| `toBe(x)` | Primitivos e mesma referência (`===`) |
| `toEqual(obj)` | Igualdade estrutural (ignora `undefined`) |
| `toStrictEqual(obj)` | Igualdade estrutural estrita |
| `toMatchObject(parcial)` | Objeto contém pelo menos essas chaves |
| `toHaveLength(n)` | Arrays/strings |
| `toContain(item)` / `toContainEqual(obj)` | Item em array (referência / estrutural) |
| `toBeNull()` · `toBeUndefined()` · `toBeDefined()` · `toBeTruthy()` · `toBeFalsy()` | Nulidade e veracidade |
| `toBeGreaterThan(n)` · `toBeCloseTo(n)` | Números (`toBeCloseTo` para floats; aqui usamos centavos inteiros) |
| `toMatch(/regex/)` | Strings |
| `toThrow('msg')` | A função lança erro: `expect(() => fn()).toThrow()` |
| `.not.<matcher>` | Negação |

**Matchers assimétricos** (dentro de `toEqual`/`toHaveBeenCalledWith`):

```ts
expect(list).toEqual([
  expect.objectContaining({ title: 'Férias', total: 50000 }),
]);
expect(fn).toHaveBeenCalledWith(expect.any(String), expect.anything());
```

## Código assíncrono

Sempre **`await`** (ou `return`) a promise. Senão o teste termina antes e passa sem verificar nada.

```ts
it('resolve', async () => {
  const s = await ds.summary.get();
  expect(s.general.total).toBe(0);
});

// .resolves / .rejects — exigem await
await expect(ds.auth.signIn({ email, password: 'x' })).rejects.toBeInstanceOf(DataError);
await expect(ds.activities.list()).rejects.toMatchObject({ code: 'unauthorized' });
```

- Ao testar rejeições com `try/catch`, use `expect.assertions(1)` para garantir que o `catch` rodou.
- Não misture o callback `done` com promises (o Jest lança erro). Neste projeto, use sempre `async/await`.

## Setup e teardown

| Hook | Roda |
|---|---|
| `beforeEach` / `afterEach` | Antes/depois de **cada** teste do escopo |
| `beforeAll` / `afterAll` | Uma vez por arquivo (ou por `describe`) |

- Hooks no topo do arquivo valem para todos os testes. Dentro de `describe`, só para os daquele bloco.
- Ordem: os `before*` de fora rodam antes dos de dentro, e os `after*` de dentro antes dos de fora.
- O Jest executa **todos os callbacks de `describe` antes** de qualquer teste. Não coloque setup solto dentro de `describe`, use hooks.
- **Neste projeto**, o `jest.setup.ts` já tem um `beforeEach` global que zera dados, cache e sessão ([Setup](01-setup.md)). Nos arquivos, use `beforeEach` para o *arrange* comum (ex.: `await signInTestUser()`).
- Teste que passa sozinho mas falha na suíte indica **estado compartilhado vazando**. Isole com `it.only` e reset no `beforeEach`.

## Funções mock

```ts
const onChange = jest.fn();                    // registra chamadas
const fn = jest.fn((x: number) => x + 1);      // com implementação

fn.mockReturnValue(10);           // sempre
fn.mockReturnValueOnce(1);        // só na próxima chamada
fn.mockResolvedValue(data);       // promise resolvida
fn.mockRejectedValue(new Error()); // promise rejeitada
fn.mockImplementation(() => …);

expect(onChange).toHaveBeenCalled();
expect(onChange).toHaveBeenCalledTimes(1);
expect(onChange).toHaveBeenCalledWith('paid');
expect(onChange).toHaveBeenLastCalledWith('paid');
expect(onChange).not.toHaveBeenCalled();
onChange.mock.calls;   // [[arg1, arg2], …]
onChange.mock.results; // [{ type: 'return', value }, …]
```

`jest.spyOn(obj, 'metodo')` observa (e opcionalmente substitui) um método existente. Restaure com `mockRestore()`.

## Mock de módulos

```ts
// Factory: substitui o módulo inteiro
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn() }));

// Parcial: mantém o real e troca só uma parte (padrão do projeto para expo-router)
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
```

- O `jest.mock` é **içado** (hoisted) para o topo do arquivo. A factory não pode usar variáveis de fora, exceto as com prefixo `mock` (`const mockPush = jest.fn()`) ou o que ela mesma carregar com `require`/`jest.requireActual`.
- Para tipar um módulo mockado: `jest.mocked(router.push)`.
- Limpeza entre testes: `jest.clearAllMocks()` zera as chamadas, `jest.resetAllMocks()` zera também as implementações, e `jest.restoreAllMocks()` restaura os spies. Considere ativar `"clearMocks": true` na config do Jest.

### O que mockar aqui

| Mockar | Não mockar |
|---|---|
| `expo-router` (`router`), quando testar a tela fora do router | Hooks das features (`useActivities`…) |
| Módulos nativos sem suporte no Jest (haptics, câmera…) | Componentes de `@/components/ui` |
| `@/data`, mas **só** via `jest.setup.ts` (já feito globalmente) | Funções de `@/domain` |

## Timers falsos

Útil para debounce, toasts com timeout e animações.

```ts
jest.useFakeTimers();
// … dispara algo com setTimeout(cb, 1000)
jest.advanceTimersByTime(1000);   // avança o relógio
jest.runOnlyPendingTimers();      // roda o que está pendente agora
jest.runAllTimers();              // roda tudo (cuidado com timers recursivos)
jest.useRealTimers();             // restaura (faça no afterEach)
```

- Com RNTL, o `userEvent` e o `waitFor` já lidam com timers falsos ([03](03-testing-library.md#timers-falsos)).
- O mock data source usa `setTimeout` para a latência. Nos testes ela é `0`, então não precisa de timers falsos.

## Cobertura

```bash
npx jest --coverage
```

O relatório HTML fica em `coverage/lcov-report/index.html`. A meta sugerida é **100% em `src/domain/`** e alta em `src/data/`. Na UI, priorize os fluxos em vez do percentual.

## CLI útil

| Comando | Efeito |
|---|---|
| `npx jest --watch` | Reexecuta os testes afetados pelas mudanças |
| `npx jest caminho/` | Filtra por arquivo/pasta |
| `npx jest -t "nome"` | Filtra por nome do teste |
| `npx jest --detectOpenHandles` | Mostra o que impede o processo de encerrar |
| `npx jest --clearCache` | Limpa o cache de transformação (após mudar babel/config) |
