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
| grayscale/gray-400 | `#585860` | `colors.textMuted` | Placeholder, meta-info, abas inativas |
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

| Componente no Figma | Código | Notas |
|---|---|---|
| Logo + App Name | `ui/Logo` | ⚠️ Ícone placeholder (lucide `Zap`). Exporte o SVG do node `5108:760`. |
| Button (verde) | `ui/Button variant="primary"` | `icon` opcional ("+ Criar") |
| Button (cinza) | `ui/Button variant="secondary"` | "Criar conta", "Editar" |
| Button (lixeira) | `ui/Button variant="danger" icon={Trash2}` | Sem label → círculo 48×48 |
| Botão "+ Criar/Nova" flutuante | `ui/Fab` | |
| Input | `ui/Input` (+ `form/FormInput`) | Props `icon`, `prefix` ("R$"), `error` |
| Card | `ui/Card` | Com `onPress` vira `Pressable` |
| Avatar / People | `ui/Avatar`, `ui/AvatarGroup` | Iniciais calculadas do nome |
| Badge | `ui/StatusBadge` | Pago, Pendente ou Parcial |
| Status Select | `ui/StatusSelect` | Segmented "Pendente \| Pago" |
| Estado vazio (ícone + texto) | `ui/EmptyState` | |
| Logo + Título + Subtítulo | `ui/TabHeader` | Cabeçalho das 3 abas |
| Bottom navigation | `Tabs` em `(tabs)/_layout.tsx` | |
| Overflow (sheet) | Rota `formSheet` + `ui/Sheet` | Ver [03](03-telas-e-navegacao.md) |
| Card de atividade | `features/activities/components/ActivityCard` | |
| Card de despesa | `features/expenses/components/ExpenseCard` | |
| Card / Participante (Resumo) | `features/summary/components/AmountCard`, `CountCard` | |

## Como inspecionar o Figma durante o desenvolvimento

Com o conector do Figma (MCP) ativo, peça ao agente `get_design_context` no node da tela (IDs em [03](03-telas-e-navegacao.md)). Ele devolve medidas e estilos exatos para ajustar o componente.
