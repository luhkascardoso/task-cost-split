# E2E · 02 · Referência do Maestro

← [10 · E2E com Maestro](../10-e2e-maestro.md) · Fonte: [docs.maestro.dev](https://docs.maestro.dev/) (lista completa de comandos em [Commands available](https://docs.maestro.dev/reference/commands-available))

## Anatomia de um flow

Um arquivo YAML com **cabeçalho** (configuração) e **comandos**, separados por `---`:

```yaml
appId: com.taskcostsplit.app       # obrigatório: bundle ID / package
name: Cadastro de usuário          # opcional (aparece nos relatórios)
tags:
  - smoke
  - auth
env:
  USER_NAME: "Lucas Teste"
onFlowStart:
  - runFlow: ../../subflows/launch-clean.yaml
onFlowComplete:
  - takeScreenshot: fim
---
- tapOn: "Criar conta"
- inputText: ${USER_NAME}
- assertVisible: "Atividades"
```

## Comandos mais usados

| Comando | Uso | Exemplo |
|---|---|---|
| `launchApp` | Abre o app. Opções: `appId`, `clearState`, `clearKeychain` (iOS), `stopApp` (padrão `true`), `permissions`, `arguments` | `- launchApp: { clearState: true }` |
| `openLink` | Abre uma URL ou deep link | `- openLink: taskcostsplit://activity/123` |
| `tapOn` | Toca no elemento. `retryTapIfNoChange: true` ajuda com toques "fantasma" em elementos ainda não clicáveis | `- tapOn: "Salvar"` |
| `longPressOn` · `doubleTapOn` | Variações de toque | |
| `inputText` | Digita no campo **focado** (toque nele antes). `label` descreve o passo no relatório | `- inputText: "Férias de verão"` |
| `inputRandomEmail` · `inputRandomPersonName` · `inputRandomText` · `inputRandomNumber` | Dados aleatórios (`length` nos dois últimos, padrão 8) | `- inputRandomEmail` |
| `eraseText` | Apaga caracteres do campo focado | `- eraseText: 10` |
| `pressKey` | Teclas especiais (ex.: `Enter`, `Backspace`) | `- pressKey: Enter` |
| `hideKeyboard` | Fecha o teclado (**instável no iOS**, veja abaixo) | |
| `assertVisible` / `assertNotVisible` | Verifica presença/ausência, **esperando** | `- assertVisible: "Pendente"` |
| `assertTrue` | Condição JavaScript | `- assertTrue: ${output.total > 0}` |
| `scroll` · `scrollUntilVisible` · `swipe` | Rolagem e gestos | `- scrollUntilVisible: { element: "Gasolina" }` |
| `back` | Botão voltar (Android) | |
| `extendedWaitUntil` | Espera longa explícita | veja [Espera](#espera) |
| `waitForAnimationToEnd` | Espera a animação parar (ex.: abertura de sheet) | `- waitForAnimationToEnd: { timeout: 5000 }` |
| `runFlow` | Executa um subflow (reuso) ou comandos condicionais | veja [Reuso](#reuso-e-condições) |
| `takeScreenshot` | Salva um print em `takeScreenshot/` | `- takeScreenshot: detalhe-despesa` |
| `stopApp` · `killApp` · `clearState` | Ciclo de vida do app | |
| `setPermissions` · `setLocation` · `setOrientation` · `setAirplaneMode` | Estado do dispositivo | |
| `runScript` · `evalScript` | JavaScript (dados, HTTP) | |

Qualquer comando aceita `optional: true` (não falha se o elemento não existir) e `label: "…"` (nome no relatório).

## Seletores

Forma curta (texto) ou mapa:

```yaml
- tapOn: "Salvar"            # texto
- tapOn:
    id: "sign-in-email"      # testID
- tapOn:
    text: "Excluir"
    index: 1                 # 2ª ocorrência (base 0)
- tapOn:
    point: "50%, 90%"        # coordenada (último recurso)
```

| Seletor | Casa com |
|---|---|
| `text` | Texto visível. No **iOS** também casa com `accessibilityLabel`, e no **Android** com `contentDescription`. |
| `id` | No React Native, o `testID`: `accessibilityIdentifier` no iOS e resource-id no Android. |
| `index` | Desempate entre vários matches (base 0) |
| `point` | Coordenada relativa (`"50%, 50%"`) ou absoluta (`"100, 250"`) |

Há também seletores **relacionais** (`below`, `above`, `childOf`…), de **estado** (`enabled`, `checked`, `selected`, `focused`) e de **dimensão**. Consulte a [referência de seletores](https://docs.maestro.dev/reference/selectors).

### ⚠️ `text` e `id` são expressões regulares

O texto do seletor é tratado como **regex** (match do texto inteiro). Valores em reais têm caracteres especiais (`$` e `.`) que **precisam de escape**:

```yaml
- assertVisible: "R\\$ 2\\.200,00"        # ✅ casa com "R$ 2.200,00"
- assertVisible: "R$ 2.200,00"            # ❌ "$" é âncora de fim de linha na regex
- assertVisible: ".*por pessoa.*"         # match parcial
- assertVisible: "Em [0-9]+ atividades?"  # padrão
```

### React Native: dicas da doc

- `testID` → seletor `id`. É mais estável que texto quando o texto muda ou é traduzido.
- No iOS, componentes muito aninhados podem "engolir" toques. Coloque `accessible={false}` no container externo e `accessible={true}` no elemento interno.

## Espera

O Maestro **espera automaticamente**: `assertVisible`/`tapOn` repetem a busca até o elemento aparecer, ou até o tempo limite. **Não use pausas fixas.**

```yaml
- tapOn: "Salvar"
- assertVisible: "Despesas"         # espera a tela carregar

- extendedWaitUntil:                # operações longas (ex.: futuro backend lento)
    visible: "Férias de verão"
    timeout: 30000

- waitForAnimationToEnd:            # antes de tocar em algo dentro de um sheet que está abrindo
    timeout: 5000
```

Use tempos realistas: limites longos em todo lugar escondem regressões de performance.

## Variáveis

```yaml
env:
  TITLE: "Férias de verão"
---
- inputText: ${TITLE}
```

Na linha de comando, `maestro test -e TITLE="Jantar" flow.yaml` sobrescreve o valor. Valores aleatórios também podem ser gerados via JavaScript (`${...}`). Veja [Parameters and constants](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants).

## Reuso e condições

```yaml
# Subflow com parâmetros (caminho relativo ao flow que chama)
- runFlow:
    file: ../../subflows/sign-up.yaml
    env:
      USER_NAME: "Lucas Teste"

# Condicional: visible | notVisible | platform | true (várias condições combinam com AND)
- runFlow:
    when:
      platform: Android
    commands:
      - back
```

Os hooks `onFlowStart`/`onFlowComplete` ficam no cabeçalho. Se o `onFlowStart` falhar, o corpo é pulado, mas o `onFlowComplete` ainda roda, e o flow fica marcado como falho.

## Tags e descoberta

- `tags:` no cabeçalho, e no CLI `--include-tags`/`--exclude-tags` (vírgula = OU; combinar os dois = incluídos menos excluídos).
- Por padrão, `maestro test <pasta>` só roda flows **no nível raiz** da pasta. Subpastas exigem `flows:` com glob no `config.yaml`.

## `config.yaml` (workspace)

Fica na raiz da pasta passada ao `maestro test`:

```yaml
flows:
  - "flows/**"              # recursivo
  - "!subflows/**"          # exclui (subflows não são testes)
includeTags: []
excludeTags:
  - wip
executionOrder:             # força uma sequência (opcional)
  continueOnFailure: true
  flowsOrder:
    - sign-up
testOutputDir: build/maestro-results
platform:
  ios:
    snapshotKeyHonorModalViews: false   # inclui elementos atrás de modais na hierarquia
```

> As flags do CLI têm prioridade sobre o `config.yaml`. `platform.*.disableAnimations` só vale no Maestro Cloud.

## CLI

| Comando | Para quê |
|---|---|
| `maestro test <arquivo\|pasta>` | Executa flows |
| `  -e KEY=valor` | Variável de ambiente |
| `  --include-tags=smoke` · `--exclude-tags=wip` | Filtra por tags |
| `  --format junit\|html\|html-detailed --output <arq>` | Relatório |
| `  --test-output-dir <pasta>` · `--debug-output <pasta>` | Artefatos e log |
| `  --config <arquivo>` | Outro config |
| `  --shards N` | Paraleliza em N dispositivos |
| `  --continuous` / `-c` | Reexecuta ao salvar o YAML (ótimo para escrever flows) |
| `maestro --device <UDID> test …` | Escolhe o dispositivo |
| `maestro list-devices` · `maestro start-device --platform ios` | Dispositivos |
| `maestro record <flow> [saida.mp4]` | Grava vídeo do flow |
| `maestro cloud --app-file <app> --flows <pasta>` | Roda no Maestro Cloud |

## Relatórios e artefatos

```bash
maestro test --format junit --output build/maestro-report.xml .maestro
maestro test --format html-detailed --output build/maestro-report.html .maestro
```

- Os artefatos ficam por padrão em `~/.maestro/tests/<timestamp>/`, com uma pasta por flow (`commands.json`, `logs/`).
- Numa **falha**, o Maestro salva um print do passo (`screenshots/`) e a hierarquia de views (`screen-hierarchy/`). Esta última é útil quando um seletor não casa.
- `--analyze` tira um print antes de cada passo.

## Problemas conhecidos relevantes

| Problema | Contorno |
|---|---|
| `inputText` falha em campo de senha no simulador iOS (AutoFill) | Desligue "Preencher Senhas Automaticamente" no simulador ([Setup](01-setup.md#23-desligar-a-autofill-de-senhas-no-simulador-ios)) |
| `hideKeyboard` instável no iOS | Toque numa área não interativa (ex.: título da tela/sheet) com `tapOn` |
| App não abre | `appId` errado. Confira com `xcrun simctl listapps booted \| grep CFBundleIdentifier` |
| Seletor com `R$` ou `.` não casa | Escape da regex (`R\\$ 1\\.100,00`) |
