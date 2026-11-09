This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Este projeto (TaskCost Split)

App de divisão de despesas. Leia `README.md` e `docs/` antes de mudar algo estrutural.

- Camadas: `src/app` (rotas finas) → `src/features/*/api.ts` (React Query) → `src/domain` (regras puras, testadas) → `src/lib`. Ver `docs/01-arquitetura.md`.
- Dinheiro é sempre inteiro em **centavos**. Regras de divisão/status em `src/domain` — altere o teste junto (`docs/05-regras-de-negocio.md`).
- Componentes seguem `docs/12-atomic-design-e-compound.md`: nível atômico certo (`src/components/ui/{atoms,molecules,organisms,templates}`, ou `src/features/*/components` se conhecer o domínio), import só de níveis abaixo, compound (Context + `Object.assign`) quando houver estado compartilhado ou estrutura variável. Importe sempre de `@/components/ui`.
- Estilos só via tokens de `@/theme` (extraídos do Figma) e componentes de `@/components/ui`. Mapa Figma→código em `docs/02-design-system.md`; nodes de cada tela em `docs/03-telas-e-navegacao.md`.
- Sheets são rotas `presentation: 'formSheet'` registradas em `src/app/(app)/_layout.tsx` (sem header nativo, sem `flex: 1` com `fitToContents`).
- Dados só via o contrato `DataSource` (`src/data/types.ts`) importando `data` de `@/data`; nunca importe `src/data/mock` fora de `src/data`. Hooks nas features, invalidação via `queryKeys`.
- Não há backend ainda (decisão do usuário: backend próprio, a ser feito depois — não criar servidor sem pedido). O app roda com a implementação `mock` (AsyncStorage). Ver `docs/04-camada-de-dados.md`.
- Siga os princípios SOLID de `docs/11-solid.md` (checklist de feature nova e de PR). Ao tocar um arquivo listado em "Débitos conhecidos", corrija o débito ou não o agrave.
- Node >= 22.13. Antes de concluir: `npm run typecheck && npm run lint && npm test`.
- Code review: a skill `.claude/skills/code-review` aplica estas regras. Rode `/code-review` antes de abrir PR; no GitHub ela roda sozinha em cada PR (`.github/workflows/code-review.yml`).
