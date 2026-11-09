## Objetivo

<!-- O que muda para quem usa o app, em 1 ou 2 frases. Link da issue: Closes #… -->

## Tipo de mudança

- [ ] Funcionalidade nova
- [ ] Correção de bug
- [ ] Refatoração (sem mudar comportamento)
- [ ] Docs, CI ou configuração
- [ ] Mudança de regra de negócio (`src/domain`, ver docs/05)
- [ ] Mudança no contrato `DataSource` (ver docs/04)

## Como testar

<!-- Passos para ver a mudança no app. Telas/fluxos de docs/03 afetados. -->

1.

## Checklist

**Qualidade**
- [ ] `npm run check` passa (typecheck, lint, testes). O pre-push e o CI repetem isso.
- [ ] Regra nova ou alterada em `src/domain` tem teste novo ou alterado junto.
- [ ] Testei no simulador/aparelho os fluxos afetados (ou rodei os E2E do Maestro).

**Arquitetura** ([11 · SOLID](../docs/11-solid.md), [12 · Atomic Design](../docs/12-atomic-design-e-compound.md))
- [ ] Rotas finas; dados só via `@/data`; `domain` puro; `components/ui` sem features.
- [ ] Componentes no nível atômico certo; testIDs do Maestro mantidos.

**Erros e dinheiro** ([04 · Erros](../docs/04-camada-de-dados.md#erros), [05 · Dinheiro e duplicidade](../docs/05-regras-de-negocio.md#dinheiro-e-duplicidade))
- [ ] Valores em centavos; erros como `DataError`; tela usa `errorMessage`.
- [ ] Nenhuma mutation com retry automático; falha de escrita aparece na tela.

**Segurança e acessibilidade**
- [ ] Nenhum segredo, token ou dado pessoal em código, log ou `queryKey`.
- [ ] Passa no [checklist de acessibilidade](../docs/12-atomic-design-e-compound.md#acessibilidade).

**IA** ([13 · IA no desenvolvimento](../docs/13-ia-no-desenvolvimento.md))
- [ ] Li todo o código gerado por IA e conferi os achados do code review antes de corrigir.

## Screenshots / vídeo

<!-- Antes e depois, quando a mudança for visual. -->
