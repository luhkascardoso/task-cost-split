# 03 · Telas e navegação

## Árvore de navegação

```
Root Stack (_layout.tsx)
├── /  (index.tsx) ──────────── sempre disponível; redireciona p/ /sign-in ou /activities
├── (auth)  [guard: deslogado]
│   ├── /sign-in ────────────── Login
│   └── /sign-up ────────────── Cadastro
└── (app)   [guard: logado]  Stack
    ├── (tabs)  Tabs
    │   ├── /activities     ─── Atividades
    │   ├── /summary        ─── Resumo
    │   └── /participants   ─── Participantes
    ├── /activity/[activityId] ─────────────── Detalhe da atividade (tela cheia)
    └── formSheets
        ├── /activity/new
        ├── /activity/[activityId]/edit
        ├── /activity/[activityId]/expense/new
        ├── /activity/[activityId]/expense/[expenseId]        (detalhe/pagamentos)
        └── /activity/[activityId]/expense/[expenseId]/edit
```

Deep link: `taskcostsplit://activity/<id>` (scheme no `app.json`).

## Telas × Figma × status

| Tela | Rota (arquivo em `src/app`) | Node Figma | Status |
|---|---|---|---|
| Login | `(auth)/sign-in.tsx` | `5135:879` | ✅ implementada |
| Cadastro | `(auth)/sign-up.tsx` | `5137:1254` | ✅ implementada |
| Atividades: vazio e lista | `(app)/(tabs)/activities.tsx` | `3102:649`, `5108:890` | ✅ **tela de referência** |
| Resumo: vazio e lista | `(app)/(tabs)/summary.tsx` | `5108:1165`, `5108:1239` | ✅ implementada |
| Participantes: vazio e lista | `(app)/(tabs)/participants.tsx` | `5108:1339`, `5108:1352` | ✅ implementada |
| Nova atividade (sheet) | `(app)/activity/new.tsx` | `5108:2236` / `5108:2419` | ✅ (data como texto, ver roadmap) |
| Editar atividade (sheet) | `(app)/activity/[activityId]/edit.tsx` | `5109:999` / `5109:1035` | ✅ |
| Atividade: vazia e com despesas | `(app)/activity/[activityId]/index.tsx` | `5109:1808`, `5109:842` | ✅ |
| Nova despesa (sheet) | `…/expense/new.tsx` | `5108:2249` / `5136:1026` | ✅ versão inicial |
| Detalhe da despesa (sheet) | `…/expense/[expenseId]/index.tsx` | `5109:1565` / `5109:1684` | ✅ |
| Editar despesa (sheet) | `…/expense/[expenseId]/edit.tsx` | (reusa Nova despesa) | ✅ |

> ✅ = estrutura, dados e interações prontos. O **pixel-perfect** ainda precisa de revisão contra o Figma em dispositivo (veja [08](08-roadmap.md)).

> **Por que existe `src/app/index.tsx`:** o app sempre abre em `/`. Se `/` estiver dentro de um grupo protegido, deslogado não existe tela para essa URL e aparece "Unmatched Route". Por isso `/` fica fora dos guards e só redireciona. **Não crie outro `index.tsx` dentro de `(auth)` ou `(app)`**, porque conflita com essa rota.
>
> O `(app)/_layout.tsx` define `unstable_settings.anchor = '(tabs)'`: num deep link direto para uma atividade, as abas ficam por baixo e o "voltar" funciona.

## Fluxos principais

1. **Primeiro uso:** Cadastro → Atividades (vazio) → "+ Criar" → sheet Nova atividade → Salvar → abre o Detalhe da atividade (vazio) → "Nova despesa".
2. **Registrar despesa:** Detalhe da atividade → "+ Nova" → sheet → Título, valor, participantes (digite para buscar, Enter cria) → Salvar → card com badge **Pendente**.
3. **Marcar pagamento:** toque no card da despesa → sheet de detalhe → `Pendente | Pago` por pessoa. O badge recalcula na hora (update otimista).
4. **Editar/excluir:** lápis no topo da atividade, ou "Editar"/lixeira no sheet da despesa.

## Sobre os form sheets

- Ficam declarados em `(app)/_layout.tsx` com `presentation: 'formSheet'` e `sheetAllowedDetents: 'fitToContents'`.
- **Limitação:** não existe header nativo dentro do sheet. Título e botão de fechar (X) são parte do conteúdo (`ui/Sheet`).
- Com `fitToContents`, **não use `flex: 1`** no conteúdo do sheet.
- No Android, o máximo é de 3 detents.
- O "Nova atividade" do Figma flutua centralizado com margens. O sheet nativo fica ancorado embaixo. É uma diferença aceita. Se o design exigir, troque por `presentation: 'transparentModal'` com um card centralizado.
