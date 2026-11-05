# 07 · Setup do ambiente

## Pré-requisitos

| Ferramenta | Versão | Notas |
|---|---|---|
| **Node.js** | **≥ 22.13** | Exigência do Expo SDK 58 / RN 0.88. Use `nvm use` (há `.nvmrc`). |
| npm | 10+ | `.npmrc` tem `legacy-peer-deps=true` (conflito de peer de `react-dom` com `jest-expo`) |
| Xcode / Android Studio | — | Só para emulador ou dev build local |
| Expo Go | SDK 58 | Funciona: todas as libs nativas atuais vêm no Expo Go |

Não precisa de banco nem de servidor: o app usa a fonte de dados **mock** local (ver [04](04-camada-de-dados.md)).

## 1. Instalar

```bash
nvm install && nvm use
npm install
```

## 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

```
EXPO_PUBLIC_DATA_SOURCE=mock
```

Variáveis `EXPO_PUBLIC_*` vão para o bundle, então **nunca** coloque segredos nelas.

## 3. Rodar

```bash
npm start          # e pressione i (iOS), a (Android) ou escaneie o QR com o Expo Go
```

No primeiro acesso, use **Criar conta**. A conta e todos os dados ficam no AsyncStorage do aparelho ou simulador.

## 4. Qualidade

```bash
npm test           # Jest (domínio + mock data source)
npm run typecheck
npm run lint
```

## Builds (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development   # dev build (quando houver libs nativas fora do Expo Go)
npx eas-cli@latest build --profile production
```

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Node.js … is outdated` / erros estranhos no Metro | Node < 22.13. Rode `nvm use`. |
| `EXPO_PUBLIC_DATA_SOURCE="…" não suportado` | Só `mock` existe por enquanto. |
| Erros de tipo em `router.push` | Typed routes desatualizadas. Rode `npm start` uma vez, que regenera `.expo/types`. |
| `ERESOLVE` no `npm install` | Confira se o `.npmrc` existe (`legacy-peer-deps=true`). |
| Quero zerar os dados de teste | Apague o app do simulador/aparelho (ou limpe o storage do Expo Go). |
| `pod install` falha com `ios/HelloWorld/PrivacyInfo.xcprivacy` | Bug do Expo prebuild ([#44338](https://github.com/expo/expo/issues/44338)): o `.pbxproj` ainda aponta para `HelloWorld` depois de renomear a pasta. O plugin `plugins/withIosTaskCostSplitSymlink.js` cria o symlink. Se a pasta `ios/` já existir sem o link: `rm -rf ios && npx expo prebuild --platform ios`. |
| `resource fork, Finder information…` no `ExpoModulesJSI` | O projeto está em `~/Documents` (iCloud). O File Provider marca o framework e o codesign falha. O mesmo plugin redireciona o build para `~/Library/Caches/task-cost-split-expo-modules-jsi`. Ideal a longo prazo: mover o repo para fora do iCloud (ex.: `~/Developer/…`). |
