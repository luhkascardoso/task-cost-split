# 10 · Testes E2E com Maestro

Guia de uso e implementação de testes **end-to-end** no TaskCost Split com o [Maestro](https://docs.maestro.dev/). Ele complementa os testes unitários e de integração do Jest/RNTL ([09 · Testes](09-testes.md)).

> ✅ **Estrutura e flows básicos criados** em `.maestro/`. Ainda precisam ser executados contra um build instalado (veja [Setup](e2e/01-setup.md)).

| Documento | Conteúdo |
|---|---|
| **10 · E2E** (este) | O que é, quando usar, estado atual, decisões |
| [e2e/01 · Setup](e2e/01-setup.md) | Instalação, build do app para E2E, primeiro run |
| [e2e/02 · Referência](e2e/02-referencia.md) | Flows, comandos, seletores, espera, variáveis, tags, CLI, relatórios |
| [e2e/03 · Padrões do projeto](e2e/03-padroes-do-projeto.md) | Estrutura `.maestro/`, seletores, `testID`s, isolamento de dados, flows planejados |
| [e2e/04 · CI](e2e/04-ci.md) | EAS Workflows, Maestro Cloud, GitHub Actions |

## O que é o Maestro

É um framework de testes de UI para mobile (e web). Os testes, chamados **flows**, são arquivos **YAML declarativos** que dirigem o app real num simulador/emulador como um usuário faria: tocar, digitar, rolar e verificar o que está na tela. Duas características importam:

- **Espera automática:** asserções e toques aguardam o elemento aparecer, sem `sleep` manual.
- **Caixa-preta:** o Maestro não conhece React. Ele lê a árvore de acessibilidade nativa (iOS/Android). Por isso o mesmo flow serve para as duas plataformas.

## Onde o E2E entra na estratégia

| Pergunta | Ferramenta |
|---|---|
| A regra de divisão está certa? | Jest (domínio) |
| O `StatusSelect` chama `onChange`? | RNTL |
| A tela de Atividades lista os dados? | RNTL + data mock |
| **O app compila, abre, navega entre telas e sheets nativos e o fluxo principal funciona de ponta a ponta no iOS e no Android?** | **Maestro** |

O E2E é **caro** (lento, precisa de build e simulador). Use-o para os **fluxos críticos** de [03 · Telas](03-telas-e-navegacao.md#fluxos-principais), não para variações de regra. Ele cobre o que o Jest não alcança: `formSheet` nativo, teclado, safe area, splash e fontes, navegação real e persistência no AsyncStorage.

## Estado atual

| Item | Status |
|---|---|
| Maestro CLI na máquina de dev | ✅ 2.0.10 (`/opt/homebrew/bin/maestro`) |
| Java 17+ | ✅ (Zulu 17 e 21) |
| Xcode / Android SDK | ✅ |
| `bundleIdentifier` (iOS) e `package` (Android) no `app.json` | ✅ `com.taskcostsplit.app` |
| `eas.json` com perfil de E2E | ✅ perfil `e2e-test` |
| `testID`s nos componentes | ✅ auth, activity form, expense form, StatusSelect |
| Pasta `.maestro/` e flows | ✅ subflows + 5 flows (auth, activities, expenses, summary) |
| Scripts npm (`e2e`, `e2e:smoke`, `e2e:report`) | ✅ |
| CI | ⏳ futuro (veja [CI](e2e/04-ci.md)) |

## Decisões tomadas neste guia

1. **Alvo dos testes: build de E2E** (simulador iOS `.app` / Android `.apk`) com `appId` próprio, **não** o Expo Go. O Expo Go serve só para explorar telas com o Maestro Studio ([Setup](e2e/01-setup.md#modo-rápido-expo-go)).
2. **Auth na suíte:** o flow de cadastro usa `clearState` e cria `e2e@taskcostsplit.test`. Os demais reusam a sessão (`launch-and-sign-in`, sem `clearState`); se precisar, fazem login ou cadastro pela UI. Ordem em `.maestro/config.yaml`.
3. **Seletores:** texto visível em português para o que o usuário lê, e `id` (`testID`) para inputs e para elementos sem texto estável ([Padrões](e2e/03-padroes-do-projeto.md#seletores)).
4. **Estrutura:** `.maestro/` na raiz, com `flows/` por feature e `subflows/` reutilizáveis.

## Decisões pendentes (suas)

- [x] **Identificador do app:** `com.taskcostsplit.app` (`ios.bundleIdentifier` / `android.package`).
- [ ] **Onde rodar no CI:** EAS Workflows, Maestro Cloud ou GitHub Actions com emulador ([CI](e2e/04-ci.md)).
- [ ] Quando o **backend próprio** existir, os flows vão precisar de um ambiente de teste com dados controlados. Hoje o mock local resolve.
