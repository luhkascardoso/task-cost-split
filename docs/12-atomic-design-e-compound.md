# 12 · Atomic Design e Compound Components

Como organizamos e construímos componentes. Todo componente novo segue este guia.

Fontes:
- [Atomic Design, cap. 2 (Brad Frost)](https://atomicdesign.bradfrost.com/chapter-2/)
- [Compound Pattern (patterns.dev)](https://www.patterns.dev/react/compound-pattern/)

Complementa [02 · Design system](02-design-system.md) (tokens e mapa do Figma) e [11 · SOLID](11-solid.md) (responsabilidades e dependências).

---

## Parte 1 · Atomic Design

O Atomic Design divide a interface em cinco níveis. Cada nível é feito de peças do nível de baixo:

| Nível | Definição (Brad Frost) | No projeto | Onde fica |
|---|---|---|---|
| **Átomo** | Elemento básico que perde a função se for quebrado mais | `Text`, `Button`, `Input`, `Card`, `Avatar`, `StatusBadge`, `Logo` | `src/components/ui/atoms/` |
| **Molécula** | Grupo simples de átomos que funciona como uma unidade e "faz uma coisa bem feita" | `AvatarGroup`, `EmptyState`, `Fab`, `SegmentedControl`, `StatusSelect`, `FormInput` | `src/components/ui/molecules/`, `src/components/form/` |
| **Organismo** | Seção distinta da interface, feita de moléculas e átomos | `TabHeader` (genérico); `ActivityCard`, `ExpenseCard`, `ParticipantPicker`, `ExpenseFormSheet`… (de feature) | `src/components/ui/organisms/`, `src/features/*/components/` |
| **Template** | Layout de página que mostra a *estrutura* do conteúdo, sem o conteúdo real | `Screen`, `Sheet`; `AuthLayout` (de feature) | `src/components/ui/templates/`, `src/features/*/components/` |
| **Página** | Template preenchido com conteúdo real; é onde o sistema é testado de verdade | Cada rota do Expo Router | `src/app/**` |

### Design system genérico × componentes de feature

- **`src/components/ui/`** é o design system. Não conhece domínio de negócio além de tipos simples (`ShareStatus`, `ExpenseStatus`), não chama hooks de dados e não navega. Tudo entra por props.
- **`src/features/*/components/`** guarda as moléculas e organismos que conhecem o negócio (`ExpenseCard` sabe o que é uma `Expense`). Eles **compõem** peças de `@/components/ui` e nunca recriam um átomo.
- **Páginas** (`src/app/`) só montam template + organismos + hooks (ver [11 · SOLID](11-solid.md#s--responsabilidade-única)).

### Regras de dependência entre níveis

```
atoms  ←  molecules  ←  organisms  ←  templates  ←  pages (src/app)
```

1. Cada nível importa **só níveis abaixo**. Um átomo nunca importa uma molécula.
2. **Átomos** usam apenas tokens de `@/theme`, primitivos do React Native e o átomo `Text` (que é a base tipográfica). Nada de estado de negócio.
3. **Moléculas** compõem átomos e podem ter estado de UI local (aberto/fechado, opção ativa), mas não buscam dados.
4. **Organismos de feature** podem usar hooks da própria feature (`features/*/api.ts`, `hooks.ts`).
5. **Templates** definem estrutura (safe area, gutter, cabeçalho, rodapé) e recebem o conteúdo por `children`/partes. Nunca buscam dados.
6. Quem consome **sempre importa de `@/components/ui`**, nunca de `@/components/ui/atoms/...`. Dentro de `ui/`, use import relativo para o nível de baixo (`../atoms/Text`).

### Em que nível fica meu componente?

```
Dá para quebrar em partes menores que ainda fazem sentido sozinhas?
├─ Não → ÁTOMO
└─ Sim → É um grupo pequeno com uma única função (ex.: avatar + nome, ícone + texto + ação)?
    ├─ Sim → MOLÉCULA
    └─ Não → É uma seção inteira da tela (cabeçalho, card de lista, formulário, painel)?
        ├─ Sim → ORGANISMO
        └─ Não → Só define a estrutura onde outros componentes encaixam?
            ├─ Sim → TEMPLATE
            └─ Não → É uma rota → PÁGINA (src/app)
```

Depois: **conhece o domínio** (Activity, Expense, hooks de dados)? Vai para `src/features/<feature>/components/`. **É genérico**? Vai para `src/components/ui/<nível>/`.

### Ressalvas do próprio autor

- **Não é um processo linear.** Não precisa criar átomos antes das telas. Trabalhe no todo e nas partes ao mesmo tempo, e extraia peças quando a repetição aparecer.
- **Não é dogma.** Se a classificação gerar discussão longa, escolha o nível mais baixo que faça sentido e siga em frente. O objetivo é o vocabulário comum, não a taxonomia perfeita.
- **Páginas validam o sistema.** Teste a tela com conteúdo real e com variações (lista vazia, 1 item, 50 itens, título longo). Se o template quebrar, o problema está no componente, não no conteúdo.

---

## Parte 2 · Compound Components

> Componentes que **trabalham juntos para uma tarefa e compartilham estado**. O pai guarda o estado; as partes leem esse estado sem prop drilling.

```tsx
<Sheet onClose={() => router.back()}>
  <Sheet.Header>
    <Sheet.Title>Nova despesa</Sheet.Title>
    <Sheet.Close />
  </Sheet.Header>
  …
  <Sheet.Footer>…</Sheet.Footer>
</Sheet>
```

### Quando usar

Use compound quando **pelo menos um** destes for verdade:

- As partes **compartilham estado** do pai (opção ativa, aberto/fechado, `onClose`, `disabled`). Ex.: `SegmentedControl`.
- O componente tem **estrutura flexível**: telas diferentes usam partes diferentes, em ordens diferentes. Ex.: `Sheet` (o detalhe da despesa tem título + valor no cabeçalho; o formulário tem só título).
- Ele já tem, ou caminha para ter, **muitas props de "slot"** (`headerTitle`, `headerRight`, `footerLeft`, `showClose`…).

### Quando NÃO usar

- Componentes simples, com poucas props e um só layout (`Avatar`, `Text`, `EmptyState`). Props simples são mais claras.
- Quando nenhuma parte precisa de estado do pai e a estrutura nunca varia.

### Implementação padrão (siga este molde)

O patterns.dev mostra duas abordagens. **Usamos só a de Context.** A de `React.Children.map` + `cloneElement` quebra quando um filho é embrulhado num `View` e pode sobrescrever props sem avisar.

```tsx
import { createContext, use, useMemo } from 'react';

// 1. Estado compartilhado, tipado. null = "fora do pai".
interface ThingState { value: string; onChange: (v: string) => void }
const ThingContext = createContext<ThingState | null>(null);

// 2. Hook de guarda com mensagem clara.
function useThing() {
  const ctx = use(ThingContext);
  if (!ctx) throw new Error('<Thing.Part> precisa estar dentro de <Thing>.');
  return ctx;
}

// 3. Pai: dono do estado. Memoize o value para não re-renderizar as partes à toa.
function ThingRoot({ value, onChange, children }: ThingState & { children: React.ReactNode }) {
  const state = useMemo(() => ({ value, onChange }), [value, onChange]);
  return <ThingContext value={state}><View>{children}</View></ThingContext>;
}

// 4. Partes: leem do Context.
function Part({ value, children }: { value: string; children: string }) {
  const ctx = useThing();
  return <Pressable onPress={() => ctx.onChange(value)}>…</Pressable>;
}

// 5. Um único export, com as partes como propriedades (um import só para quem usa).
export const Thing = Object.assign(ThingRoot, { Part });
```

Regras:

1. **Um export** por compound (`export const Sheet = Object.assign(SheetRoot, { … })`). Não exporte as partes soltas.
2. **Nome das partes** = papel na estrutura: `Header`, `Title`, `Close`, `Footer`, `Option`, `Item`.
3. **Guarda obrigatória:** toda parte que lê o Context chama o hook de guarda, que lança um erro dizendo onde ela precisa estar.
4. **`useMemo` no value** do Provider (recomendação do patterns.dev para React 18+).
5. **React 19:** use `use(Context)` e `<Context value>`, como no restante do projeto.
6. **testID e acessibilidade** propagam pelo Context. O pai recebe o prefixo e cada parte monta o seu (`share-status-<id>-paid`). **Não quebre testIDs usados pelo Maestro** (`.maestro/`).
7. Um compound genérico pode ter **especializações** com props simples. `StatusSelect` é um `SegmentedControl` com as opções do domínio já montadas. Prefira isso a repetir as partes em várias telas.
8. Todo compound tem **teste** em `src/components/ui/__tests__/`: o estado chega às partes, a guarda lança erro fora do pai e os testIDs se mantêm.

### Compounds do projeto

| Componente | Nível | Estado compartilhado | Partes |
|---|---|---|---|
| `Sheet` | Template | `onClose` | `Header` (`align="center" \| "start"`), `Title`, `Close`, `Footer` |
| `SegmentedControl` | Molécula | `value`, `onChange`, `disabled`, `testID` | `Option` (`value`, `tone`) |

---

## Receita: criando um componente

1. **Confira o Figma** (`get_design_context`) e o [mapa em 02](02-design-system.md#mapa-figma--componentes). Talvez ele já exista.
2. **Escolha o nível** pela árvore de decisão acima e decida se é genérico (`ui/`) ou de feature.
3. **Tem estado compartilhado entre partes ou estrutura variável?** Use compound, seguindo o molde. Se não, use props simples.
4. **Construa de baixo para cima**: reutilize átomos e moléculas existentes. Estilo só via tokens de `@/theme`, texto só via `Text`, e variações em mapas `Record<…>` ([11 · SOLID](11-solid.md#o--abertofechado)).
5. **Comente o nível e o node do Figma** no JSDoc: `/** Molécula: … (Figma 5109:1683) */`.
6. **Exporte** em `src/components/ui/index.ts`, na seção do nível (só para componentes genéricos).
7. **Teste** (obrigatório para compounds) e atualize a tabela de [02](02-design-system.md) e, se for compound, a tabela acima.

## Checklist de PR (componentes)

- [ ] O componente está no nível certo e importa só níveis abaixo?
- [ ] Componentes em `ui/` são genéricos (sem hooks de dados, sem navegação)?
- [ ] Algum átomo foi recriado dentro de uma feature em vez de reutilizado?
- [ ] Componente com props de "slot" ou estado compartilhado entre partes deveria ser compound?
- [ ] O compound segue o molde (Context + guarda + `useMemo` + `Object.assign` + teste)?
- [ ] Os testIDs do Maestro foram mantidos?
- [ ] O JSDoc diz o nível e o node do Figma? O mapa de [02](02-design-system.md) foi atualizado?
- [ ] Passa no checklist de [Acessibilidade](#acessibilidade)?

---

## Acessibilidade

Requisito de todo componente, não polimento. Regras:

| Regra | Como no projeto | Situação |
|---|---|---|
| **Rótulo significativo** em todo elemento tocável | `accessibilityLabel` em botão só de ícone ("Excluir despesa", não "Botão 1"). Sem redundância: "Enviar", não "Botão Enviar, botão" | Botões de ícone já têm; conferir a cada componente novo |
| **Papel e estado** | `accessibilityRole` (`button`, `tab`, `checkbox`…) e `accessibilityState` (`selected`, `disabled`, `busy`) | `Button` define `role="button"` |
| **Área de toque ≥ 44×44** | `sizes.controlHeight` = 48. Ícones menores usam `hitSlop` | Botões e inputs ok |
| **Contraste ≥ 4.5:1** (texto) e 3:1 (texto grande, ícones) | Medir o token contra `background` e `surface` antes de usar | Ok: `textMuted` (#7e7e86) dá 4,88:1 e 4,64:1; `textSecondary`, 6,36:1 e 6,05:1 |
| **Não depender só de cor** | Status sempre com texto: `StatusBadge` usa os rótulos de `status.ts` (Pago/Pendente/Parcial) | Ok |
| **Anunciar mudanças** | Mensagens de erro e confirmações com `accessibilityLiveRegion="polite"` (Android) ou `AccessibilityInfo.announceForAccessibility` | Erro de status no detalhe da despesa já usa |
| **Ordem de leitura natural** | A ordem dos elementos no JSX segue a leitura visual | Conferir em sheets com rodapé |

Teste com leitor de tela (VoiceOver no iOS, TalkBack no Android) os fluxos de [03](03-telas-e-navegacao.md#fluxos-principais) a cada mudança visual relevante. Nos testes de componente, prefira as queries por papel e nome (`getByRole('button', { name: 'Salvar' })`), que já validam parte disso ([09](09-testes.md)).

## Candidatos conhecidos

Pontos que ainda podem evoluir. Aplique quando mexer neles (regra do escoteiro):

| Onde | Sugestão |
|---|---|
| `features/auth/components/AuthLayout.tsx` | Template com 3 props de rodapé (`footerText`, `footerAction`, `onFooterPress`). Se surgir uma variação, migre para compound (`AuthLayout.Title`, `AuthLayout.Footer`). |
| `ActivityCard` / `ExpenseCard` | Mesma estrutura (linha de título + valor, linha de metadados). Se surgir um terceiro card igual, extraia um compound `Card.Header` / `Card.Footer`. |
| `features/summary/components/SummaryCards.tsx` | O mapa de tons de `AmountCard` é recriado a cada render. Mova para um `Record` no módulo. |
