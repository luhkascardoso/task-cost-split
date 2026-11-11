# ADR 0001 · Servidor no mesmo repositório (`server/`)

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

O backend precisa usar as mesmas regras de dinheiro do app (`src/domain`) e o mesmo contrato (`DataSource`). O projeto já tem CI, code review obrigatório, board e agentes configurados neste repositório.

## Decisão

O backend vive em `server/`, com `package.json`, `tsconfig`, lint e testes próprios, no mesmo repositório do app. Não usamos workspaces do npm: o app continua sendo a raiz, e o servidor importa só `src/domain` e `src/lib/errors.ts` por caminho.

## Consequências

- Um PR pode mudar o contrato, o app e a API juntos, e o code review vê os três.
- CI, review, triagem e agentes funcionam no backend sem configuração nova além do job `server`.
- As ferramentas da raiz precisam ignorar `server/` (tsconfig, ESLint, Jest), e o servidor tem uma allowlist de imports do app ([01 · Isolamento](../01-arquitetura.md#isolamento-entre-app-e-servidor)).
- O Docker usa a raiz como contexto de build.

## Alternativas

- **Repositório separado:** isolamento total, mas o domínio teria de virar pacote publicado ou ser copiado, e cada mudança de contrato viraria dois PRs.
- **Monorepo com workspaces (`apps/mobile`, `apps/api`, `packages/domain`):** o desenho mais limpo a longo prazo, mas exige mover o app inteiro e reconfigurar Expo, EAS, Jest e CI agora. Fica como evolução se surgir um terceiro pacote.
