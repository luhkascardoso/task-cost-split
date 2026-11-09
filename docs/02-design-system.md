# 02 · Design system

Fonte: variáveis do arquivo Figma (node `3:809`). Implementação: `src/theme/tokens.ts`.

> **Regra:** nenhuma tela usa hex, `fontSize` ou espaçamento "solto". Use `colors`, `typography`, `spacing`, `radii` e `sizes`. Se faltar um token, adicione em `tokens.ts` e documente aqui.

## Cores

| Token Figma | Valor | Token no código | Uso |
|---|---|---|---|
| grayscale/gray-800 | `#0b0b0e` | `colors.background`, `card` | Fundo das telas e cards |
| grayscale/gray-700 | `#121216` | `colors.surface` | Bottom nav, sheets, painel de login |
| grayscale/gray-600 | `#1c1c22` | `colors.cardBorder`, `avatar`, `buttonSecondary` | Bordas, avatar, botão secundário |
| grayscale/gray-500 | `#2a2a2d` | `palette.gray500` | — |
| grayscale/gray-400 | `#585860` | `palette.gray400` | — (era o `textMuted`; contraste 2,79:1 insuficiente) |
| — (só no código) | `#7e7e86` | `colors.textMuted` (`palette.gray350`) | Placeholder, meta-info, abas inativas. Contraste 4,88:1 sobre `background` e 4,64:1 sobre `surface` (LUH-5); falta levar ao Figma |
| grayscale/gray-300 | `#92929a` | `colors.textSecondary` | Subtítulos |
| grayscale/gray-200 | `#e1e1e6` | `palette.gray200` | — |
| grayscale/gray-100 | `#fafafa` | `colors.textPrimary` | Texto principal |
| green/green-base | `#30a65d` | `colors.brand` | Botão primário, aba ativa |
| green/green-light | `#71d697` | `colors.brandLight` | Logo, valores, "Voltar", borda do botão |
| feedback/success | `#41d0d8` / `#0a2324` | `colors.success` / `successBg` | **Pago** |
| feedback/danger | `#e77482` / `#360f14` | `colors.danger` / `dangerBg` | **Pendente**, excluir |
| feedback/alert | `#deb55e` / `#281f0b` | `colors.alert` / `alertBg` | **Parcial** |

O tema é **só escuro** (`userInterfaceStyle: "dark"` no `app.json`).

## Tipografia

| Estilo Figma | Fonte | Token |
|---|---|---|
| Heading Lg | Sora Bold 20 | `typography.headingLg` (valores do Resumo) |
| Label/Large | Inter SemiBold 20 | `labelLg` (títulos de tela) |
| Label/Medium | Inter SemiBold 16 | `labelMd` (botões, títulos de sheet) |
| Label/Small | Inter Medium 14 | `labelSm` (títulos de card) |
| Text/Medium | Inter Regular 16 | `textMd` (inputs, subtítulos) |
| Text/Small | Inter Regular 14 | `textSm` |
| Text/ExtraSmall | Inter Regular 12 | `textXs` (badges, meta) |

O line-height é 1.5 no Figma. No RN ele vira valor absoluto (ex.: 14 → 21).

## Espaçamento e medidas

- Gutter da tela: **24** (`sizes.screenGutter`). A largura útil no Figma é 342 de 390.
- Inputs e botões: altura **48** (`sizes.controlHeight`).
- Gap entre cards: **8** (`spacing.xs`).
- Raio dos sheets: **20** (`radii.sheet`, variável `doc-border-sm`).
- Botões: pílula (`radii.pill`).

## Mapa Figma → componentes

Níveis e padrões de construção em [12 · Atomic Design e Compound](12-atomic-design-e-compound.md). Importe sempre de `@/components/ui`.

| Componente no Figma | Código | Nível | Notas |
|---|---|---|---|
| Logo + App Name | `ui/atoms/Logo` | Átomo | ⚠️ Ícone placeholder (lucide `Zap`). Exporte o SVG do node `5108:760`. |
| Button (verde) | `ui/atoms/Button variant="primary"` | Átomo | `icon` opcional ("+ Criar") |
| Button (cinza) | `ui/atoms/Button variant="secondary"` | Átomo | "Criar conta", "Editar" |
| Button (lixeira) | `ui/atoms/Button variant="danger" icon={Trash2}` | Átomo | Sem label → círculo 48×48 |
| Input | `ui/atoms/Input` (+ `form/FormInput`, molécula) | Átomo | Props `icon`, `prefix` ("R$"), `error` |
| Card | `ui/atoms/Card` | Átomo | Com `onPress` vira `Pressable` |
| Avatar | `ui/atoms/Avatar` | Átomo | Iniciais calculadas do nome |
| Badge | `ui/atoms/StatusBadge` | Átomo | Pago, Pendente ou Parcial |
| People (avatares sobrepostos) | `ui/molecules/AvatarGroup` | Molécula | |
| Botão "+ Criar/Nova" flutuante | `ui/molecules/Fab` | Molécula | |
| Estado vazio (ícone + texto) | `ui/molecules/EmptyState` | Molécula | |
| Segmented control | `ui/molecules/SegmentedControl` | Molécula · **compound** | `SegmentedControl.Option` |
| Status Select | `ui/molecules/StatusSelect` | Molécula | Especialização do `SegmentedControl`: "Pendente \| Pago" |
| Logo + Título + Subtítulo | `ui/organisms/TabHeader` | Organismo | Cabeçalho das 3 abas |
| Tela cheia | `ui/templates/Screen` | Template | Safe area + gutter |
| Overflow (sheet) | Rota `formSheet` + `ui/templates/Sheet` | Template · **compound** | `Sheet.Header`, `.Title`, `.Close`, `.Footer`. Ver [03](03-telas-e-navegacao.md) |
| Bottom navigation | `Tabs` em `(tabs)/_layout.tsx` | — | |
| Card de atividade | `features/activities/components/ActivityCard` | Organismo | |
| Card de despesa | `features/expenses/components/ExpenseCard` | Organismo | |
| Seletor de participantes | `features/expenses/components/ParticipantPicker` | Organismo | |
| Card / Participante (Resumo) | `features/summary/components/AmountCard`, `CountCard` | Organismo | |

## Como inspecionar o Figma durante o desenvolvimento

Com o conector do Figma (MCP) ativo, peça ao agente `get_design_context` no node da tela (IDs em [03](03-telas-e-navegacao.md)). Ele devolve medidas e estilos exatos para ajustar o componente.
