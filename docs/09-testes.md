# 09 · Testes

Guia de referência para implementar testes no TaskCost Split. Ele resume a documentação oficial do **Jest 30** e da **React Native Testing Library (RNTL) v14**, aplicada à arquitetura deste projeto.

| Documento | Conteúdo |
|---|---|
| **09 · Testes** (este) | Estratégia, o que testar em cada camada, convenções, checklist |
| [testes/01 · Setup](testes/01-setup.md) | Instalação, configuração do Jest e arquivos de suporte |
| [testes/02 · Jest](testes/02-jest.md) | Referência do Jest: estrutura, matchers, async, mocks, timers |
| [testes/03 · Testing Library](testes/03-testing-library.md) | Referência da RNTL v14: render, queries, userEvent, matchers, async |
| [testes/04 · Receitas](testes/04-receitas.md) | Exemplos prontos para cada camada do projeto |

> ✅ Os exemplos de setup e de receitas foram **executados** numa cópia do projeto em 02/11/2026, com RNTL 14.1.0, test-renderer 1.3.1, Jest 30.5, jest-expo 58 e Node 22: 31 testes passaram. O setup foi aplicado ao projeto em 02/11/2026 (veja [Setup](testes/01-setup.md)).

## Estado atual

| Item | Status |
|---|---|
| Jest + `jest-expo` | ✅ configurado (`npm test`) |
| Testes de domínio (`src/domain/__tests__`) | ✅ 10 testes |
| Testes da fonte de dados mock (`src/data/__tests__`) | ✅ 7 testes |
| React Native Testing Library 14 + `test-renderer` 1.3 | ✅ instalada |
| Infra de testes de UI (`jest.setup.ts`, `src/test/`) | ✅ configurada ([Setup](testes/01-setup.md)) |
| Testes de componentes, hooks, telas e rotas | ⏳ a escrever (modelos em [Receitas](testes/04-receitas.md)) |
| E2E (Maestro) | ✅ `.maestro/` + testIDs; falta rodar no simulador ([10 · E2E](10-e2e-maestro.md)) |

## Princípio

> "The more your tests resemble the way your software is used, the more confidence they can give you." (Testing Library)

Teste **comportamento**, não implementação. Um refactor que não muda o que o usuário vê não deve quebrar teste. Na prática:

- procure elementos como o usuário encontra: **papel + nome acessível** (`getByRole('button', { name: 'Salvar' })`), texto e placeholder;
- interaja como o usuário: `userEvent.press`, `userEvent.type`;
- verifique o que aparece na tela, nunca state interno, props ou estilos (salvo quando o estilo **é** o comportamento).

## O que testar em cada camada

A arquitetura em camadas ([01](01-arquitetura.md)) define o tipo de teste de cada pasta:

| Camada | Tipo de teste | Ferramentas | Prioridade |
|---|---|---|---|
| `src/domain/` | Unitário puro: funções → valores | Jest | 🔴 obrigatório. Toda regra de [05](05-regras-de-negocio.md) tem teste. |
| `src/data/` | Contrato: cenários do `DataSource` | Jest | 🔴 obrigatório. Os mesmos cenários valerão para o futuro adaptador HTTP. |
| `src/features/*/api.ts` | Hooks: query/mutation + invalidação | RNTL `renderHook` + providers | 🟡 mutations com otimismo/invalidação |
| `src/components/ui/` | Componente: renderiza, interage, acessibilidade | RNTL `render` + `userEvent` | 🟡 componentes com lógica (StatusSelect, Button, Input) |
| `src/features/*/components/` | Componente com dados | RNTL + providers + data mock | 🟡 formulários (validação, submit) |
| `src/app/` (telas) | Integração: tela + hooks + data mock | RNTL + providers, `router` mockado | 🟢 fluxos principais de [03](03-telas-e-navegacao.md) |
| Navegação / guards | Rotas e redirects | `expo-router/testing-library` (`renderRouter`) | 🟢 `index.tsx` (redirect), guards de auth |
| Fluxos completos no dispositivo | E2E | Maestro ([10](10-e2e-maestro.md)) | 🟢 |

**Não teste:** detalhes de estilo pixel a pixel (use revisão visual com o Figma), bibliotecas de terceiros, nem snapshots de telas inteiras (quebram a cada ajuste visual e ninguém revisa; o próprio guia do Expo recomenda E2E para UI).

## Convenções

- **Local:** `__tests__/` ao lado do código testado, com o nome `<Alvo>.test.ts(x)`.
  - ⚠️ **Nunca dentro de `src/app/`**: todo arquivo ali vira rota. Testes de telas ficam no `__tests__` da feature correspondente, e testes de navegação em `src/__tests__/`.
- **Idioma:** descrições em português, no formato "faz X quando Y" (`it('não chama onChange ao tocar na opção já selecionada')`).
- **Estrutura AAA:** *Arrange* (dados e render), *Act* (interação), *Assert* (expect), separados por linha em branco.
- **Um comportamento por `it`.** Vários `expect` são ok quando descrevem o mesmo comportamento.
- **Dados:** crie via `testData` (fonte de dados mock em memória) e `signInTestUser()`. Nunca dependa de estado de outro teste (o `beforeEach` global zera tudo).
- **Mocks:** só na fronteira (navegação `router`, módulos nativos). Não faça mock de hooks nem de componentes do próprio app.
- **Imports:** use o alias `@/` normalmente, que funciona no Jest.

## Comandos

```bash
npm test                         # todos os testes
npm run test:watch               # modo watch (reexecuta os afetados)
npm run test:coverage            # cobertura → coverage/lcov-report/index.html
npx jest src/domain              # só uma pasta
npx jest -t "divide igualmente"  # só testes cujo nome casa com o texto
npx jest --coverage              # relatório em coverage/lcov-report/index.html
```

## Checklist de PR

- [ ] Regra de negócio nova ou alterada tem teste em `src/domain/__tests__`
- [ ] Operação nova no `DataSource` tem cenário em `src/data/__tests__`
- [ ] Queries por `getByRole`/texto (sem `testID` quando há alternativa)
- [ ] Todas as chamadas `render`, `renderHook`, `userEvent.*` e `fireEvent.*` com `await` (v14)
- [ ] `findBy*` para o que aparece depois de carregar; `queryBy*` só com `.not.toBeOnTheScreen()`
- [ ] Nenhum efeito colateral dentro de `waitFor`
- [ ] `npm run typecheck && npm run lint && npm test` passando
