# E2E · 01 · Setup

← [10 · E2E com Maestro](../10-e2e-maestro.md) · Fonte: [docs.maestro.dev](https://docs.maestro.dev/)

## 1. Pré-requisitos

| Requisito | Detalhe | Nesta máquina |
|---|---|---|
| **Java 17+** | Recomendado 17 ou 21. `JAVA_HOME` deve apontar para ele. Versões muito antigas ou muito novas podem dar problema. | ✅ Zulu 17 / 21 |
| **Xcode** + Command Line Tools | Última versão, para simulador iOS | ✅ |
| **Android SDK** + emulador | Para Android (`adb` no PATH) | ✅ |
| **Maestro CLI** | Veja abaixo | ✅ 2.0.10 |

### Instalar ou atualizar o Maestro CLI (macOS)

```bash
# Opção 1 — script oficial
curl -fsSL "https://get.maestro.mobile.dev" | bash

# Opção 2 — Homebrew (é como está instalado aqui)
brew tap mobile-dev-inc/tap
brew trust --formula mobile-dev-inc/tap/maestro
brew install mobile-dev-inc/tap/maestro

maestro --help      # verifica a instalação
maestro --version
```

### Maestro Studio (opcional, recomendado)

É um app desktop para **escrever e depurar flows visualmente**: autocomplete de comandos e seletores a partir da tela do dispositivo, clique com o botão direito num elemento para gerar o comando, e execução passo a passo com histórico. Use-o para descobrir seletores. A instalação está em [Run tests with Maestro Studio](https://docs.maestro.dev/maestro-studio/run-tests-with-maestro-studio). O CLI continua sendo o que roda a suíte e o CI.

## 2. Preparar o app

### 2.1 Identificadores no `app.json`

O `appId` dos flows é `com.taskcostsplit.app` (`ios.bundleIdentifier` / `android.package`).

Para conferir o ID de um app instalado no simulador:

```bash
xcrun simctl listapps booted | grep CFBundleIdentifier
```

### 2.2 Gerar um build de E2E

O E2E deve rodar contra um **build instalado** (não o Expo Go). Duas opções:

**A) Local (desenvolvimento)**

```bash
npx expo run:ios       # compila, instala no simulador e abre (gera ios/ via CNG; não commitar)
npx expo run:android   # idem no emulador
```

Isso instala um **development build**, que carrega o JS do Metro. Para os flows, mantenha o `npm start` rodando. Num build de *release* (`npx expo run:ios --configuration Release`) o JS vai embutido e não depende do Metro, o que deixa a execução mais próxima da produção.

**B) EAS (CI, ou sem Xcode/Android Studio)**: perfil `e2e-test` no `eas.json`:

```json
{
  "build": {
    "e2e-test": {
      "withoutCredentials": true,
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    }
  }
}
```

```bash
npx eas-cli@latest build --profile e2e-test --platform ios
```

Ele gera `.app` (simulador) e `.apk`, que são instalados no simulador/emulador. Veja [CI](04-ci.md).

### 2.3 Desligar a AutoFill de senhas no simulador iOS

**Problema conhecido do Maestro:** no simulador iOS, o `inputText` falha em campos `secureTextEntry` (nossos campos de senha) porque o overlay de "Senha Forte" cobre o campo. A senha acaba sendo digitada no campo anterior (ex.: e-mail vira `user@mail.com123456`) e o cadastro fica na tela com "E-mail inválido".

Faça **uma** destas opções antes do E2E:

```bash
# A) script do projeto (simulador precisa estar booted)
npm run e2e:prepare-ios

# B) manual no simulador
# Ajustes → Senhas → Opções de Senha → desligar Preencher Senhas Automaticamente
```

Os campos de senha do app também usam `textContentType="none"` / `autoComplete="off"` para reduzir o overlay, mantendo `secureTextEntry`.

## 3. Primeiro run

**Pré-requisito:** o app `com.taskcostsplit.app` precisa estar **instalado** no simulador/emulador. Sem isso, o Maestro falha em ~1s com `Failed to get app binary directory for bundle com.taskcostsplit.app` / `found nothing to terminate`.

```bash
# 1) build + install (uma vez, ou após mudar nativo). O bundle ID tem de ser com.taskcostsplit.app
npx expo run:ios

# 2) se for development build, mantenha o Metro
npm start

# 3) rode os flows
maestro test .maestro/flows/auth/sign-up.yaml   # um flow
npm run e2e:smoke                               # só smoke
maestro test .maestro                           # a suíte (segundo o config.yaml)
```

`maestro --device <UDID> test …` escolhe o dispositivo quando houver mais de um, e `maestro start-device --platform ios` cria e abre um simulador.

Para conferir se o app certo está instalado:

```bash
xcrun simctl listapps booted | grep -A1 taskcostsplit
# deve aparecer CFBundleIdentifier = "com.taskcostsplit.app";
```

Se o build antigo tiver ficado com `org.name.TaskCostSplit`, limpe e reinstale (`rm -rf ios && npx expo run:ios`) — o plugin do projeto corrige o `PRODUCT_BUNDLE_IDENTIFIER` no prebuild.

## Modo rápido: Expo Go

Útil para **explorar** telas no Maestro Studio sem build nativo. **Não** use para a suíte.

- O app roda dentro do container do Expo Go, então `launchApp` com o nosso `appId` não funciona. A doc do Maestro indica abrir o app pela URL do Metro com `openLink`:

```yaml
appId: host.exp.Exponent        # app do Expo Go (confirmado instalado no simulador)
---
- openLink: exp://127.0.0.1:8081   # iOS Simulator. No emulador Android: exp://10.0.2.2:8081
```

> A doc do Maestro cita a porta `19000` (Expo antigo). No SDK 58, o Metro usa a **8081**.

- Limitações: um `clearState` apagaria o Expo Go inteiro (todos os projetos), aparecem telas e menus do próprio Expo Go, e o comportamento não é o do app final.
