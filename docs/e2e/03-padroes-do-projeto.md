# E2E · 03 · Padrões do projeto

← [10 · E2E com Maestro](../10-e2e-maestro.md)

Convenções para os flows do TaskCost Split. Os YAMLs em `.maestro/` seguem esta estrutura. Ajuste seletores com o Maestro Studio se algum passo falhar no dispositivo.

## Estrutura de pastas

```
.maestro/
├── config.yaml                 # flows, executionOrder, tags
├── subflows/
│   ├── launch-clean.yaml       # clearState → tela de login (cadastro / login inválido)
│   ├── launch-and-sign-in.yaml # sem clearState → reusa sessão (ou login/cadastro)
│   ├── sign-up.yaml            # credenciais fixas e2e@taskcostsplit.test
│   ├── sign-in.yaml
│   ├── create-activity.yaml
│   └── create-expense.yaml
└── flows/
    ├── auth/sign-up.yaml       # smoke — cria a conta
    ├── auth/sign-in-invalid.yaml
    ├── activities/…
    ├── expenses/…
    └── summary/…
```

- Um flow = **um fluxo de usuário** com objetivo claro. O nome do arquivo diz o que ele prova.
- **Tags:** `smoke` (roda em todo PR, poucos minutos), mais a feature (`auth`, `activities`, `expenses`, `summary`), e `wip` para flows em construção (excluída no config).
- Os textos dos seletores são os da UI em português. Se um texto mudar na UI, atualize o flow no mesmo PR.

## Isolamento de dados / auth na suíte

Credenciais E2E fixas: `e2e@taskcostsplit.test` / `123456` (nome `Lucas Teste`).

1. **`auth/sign-up`** (e `sign-in-invalid`): `launch-clean` (`clearState: true`) e cadastro / tentativa inválida via UI (`auth-footer-action`).
2. **Demais flows:** `launch-and-sign-in` — **não** apaga o AsyncStorage; se a sessão ainda estiver ativa, segue; senão tenta login e, se a conta não existir, cadastra. (Deep links `taskcostsplit://` só funcionam depois que o `Info.plist` tiver `CFBundleURLTypes` — hoje o build local não registra o scheme.)
3. A ordem está em `config.yaml` → `executionOrder` (cadastro → activities → expenses). Liste **apenas** flows que entram no filtro da suíte (ex.: com `e2e:smoke`, só os que têm tag `smoke`).
4. Dados de domínio são criados pela UI em cada flow; títulos/valores únicos evitam colisão quando o estado persiste.

> Flow isolado (ex.: só expenses) pode criar a conta sozinho via fallback do `launch-and-sign-in`; no smoke completo o cadastro roda primeiro.

## Seletores

| Elemento | Seletor | Motivo |
|---|---|---|
| Botões com texto (`Button`, `Fab`) | `text` ("Salvar", "Criar", "Nova despesa") | É o que o usuário vê, e o app só tem pt-BR |
| Botões só de ícone (lixeira, lápis, fechar) | `text` = `accessibilityLabel` ("Excluir", "Editar atividade", "Fechar") | O `text` casa com `accessibilityLabel` (iOS) / `contentDescription` (Android) |
| Inputs (`Input`) | **`id`** (`testID`) | O placeholder some ao digitar e não é um seletor confiável |
| Abas | **`id`** (`tab-activities`, `tab-summary`, `tab-participants`) | O rótulo visual às vezes não aparece como `text` no Maestro (iOS) |
| Segmentos `Pendente \| Pago` de uma pessoa | `id` (`testID` por participante) | Há um par por pessoa, e o texto se repete |
| Valores em R$ | `text` com **regex escapada** (`R\\$ 2\\.200,00`) | Veja a [Referência](02-referencia.md#-text-e-id-são-expressões-regulares) |
| Card clicável (Pressable) | `text` = título **ou** `accessibilityLabel` curto | No iOS o Pressable junta os filhos num único label; com `accessibilityLabel` no card o Maestro casa o título exato |

Regras:
- Não use `point` (coordenadas), porque quebra com tamanho de tela e safe area.
- Evite `index`. Se precisar, é sinal de que falta um `testID`.
- **`testID` não substitui acessibilidade.** Os botões continuam com `accessibilityLabel`, que serve aos leitores de tela, à RNTL ([09](../09-testes.md)) e ao Maestro.

### `testID`s

Convenção: `kebab-case`, no formato `<tela-ou-sheet>-<elemento>`. Para itens repetidos, use o sufixo com o id: `<elemento>-<id>`.

| Onde | `testID` | Status |
|---|---|---|
| Login (`sign-in.tsx`) | `sign-in-email`, `sign-in-password` | ✅ |
| Cadastro (`sign-up.tsx`) | `sign-up-name`, `sign-up-email`, `sign-up-password` | ✅ |
| Sheet de atividade (`ActivityFormSheet`) | `activity-form-title`, `activity-form-date` | ✅ |
| Sheet de despesa (`ExpenseFormSheet`) | `expense-form-title`, `expense-form-amount`, `expense-form-participants` | ✅ |
| Detalhe da despesa (`StatusSelect` por pessoa) | `share-status-<participantId>`, com segmentos `-pending` / `-paid` | ✅ |
| Cards de lista | `activity-card-<id>`, `expense-card-<id>` | ✅ + `accessibilityLabel` com o título (Pressable agrega os filhos no iOS) |

`Input` / `FormInput` repassam `testID` via `...rest`. `StatusSelect` aceita `testID` e sufixa os segmentos.

## Flows

| Flow | Tags | Prova |
|---|---|---|
| `auth/sign-up` | smoke, auth | Cadastro leva às Atividades vazias |
| `auth/sign-in-invalid` | auth | Credenciais inválidas mostram "E-mail ou senha inválidos" |
| `activities/create-edit-delete` | smoke, activities | Criar no sheet → detalhe → editar título → excluir → lista vazia |
| `expenses/create-and-pay` | smoke, expenses | Nova despesa com 2 pessoas → card "Pendente" → marcar "Pago" para uma → "Parcial" |
| `summary/summary-totals` | summary | Resumo reflete pago/pendente/total |

Arquivos em `.maestro/flows/` e subflows reutilizáveis em `.maestro/subflows/` (`launch-clean`, `sign-up`, `create-activity`).

> Pontos a validar no primeiro run: `pressKey: Enter` no seletor de participantes (`onSubmitEditing`), e se o `inputText` no campo de valor respeita a máscara centavos-primeiro.

## Scripts sugeridos (`package.json`)

```json
"e2e": "maestro test .maestro",
"e2e:smoke": "maestro test --include-tags=smoke .maestro",
"e2e:report": "maestro test --format html-detailed --output build/maestro-report.html .maestro"
```

Adicione `build/` ao `.gitignore`, se ainda não estiver.

## Checklist ao criar um flow

- [ ] Começa com `launch-clean` e cria os próprios dados
- [ ] Seletores por texto visível ou `id`, sem `point`
- [ ] Valores em R$ com regex escapada
- [ ] Sem pausas fixas: `assertVisible`/`waitForAnimationToEnd` para esperar
- [ ] Tags corretas (`smoke` só para o essencial)
- [ ] Roda no iOS **e** no Android
- [ ] `name:` descreve o que o flow prova
