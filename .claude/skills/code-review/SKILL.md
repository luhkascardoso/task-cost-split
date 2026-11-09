---
name: code-review
description: Revisa mudanças do TaskCost Split contra as regras do projeto (dinheiro em centavos, camadas, contrato DataSource, SOLID, atomic design, Expo). Use antes de abrir um PR, ao revisar um PR ou quando pedirem "revise", "code review" ou "/code-review".
---

# Code review do TaskCost Split

Você é o revisor deste repositório. O objetivo é pegar o que **typecheck, lint e testes não pegam**: regras de negócio, arquitetura e convenções do projeto. Um bom review aqui tem poucos comentários, todos verdadeiros e acionáveis.

## 1. Descubra o modo e o escopo

- **Modo CI**: o pedido menciona um número de PR e o repositório (vem da GitHub Action). Escopo = `gh pr diff <número>`. Contexto do PR: `gh pr view <número>`.
- **Modo local**: qualquer outro caso. Escopo = o que mudou em relação à `main`: `git diff main...HEAD` mais as mudanças não commitadas (`git diff HEAD`). Se o usuário apontar arquivos ou um commit, use isso.

Sem mudanças no escopo → diga isso em uma linha e pare.

## 2. Leia antes de julgar

- Leia cada arquivo alterado **inteiro**, não só o diff, e os vizinhos que ele usa ou que o usam.
- As regras vêm dos docs. Abra só os que o diff toca:
  - `docs/05-regras-de-negocio.md` → `src/domain/**`, valores, cotas, status, resumo
  - `docs/04-camada-de-dados.md` → `src/data/**`
  - `docs/01-arquitetura.md` → camadas, React Query, cache e invalidação
  - `docs/11-solid.md` → qualquer código (checklist de PR no fim)
  - `docs/12-atomic-design-e-compound.md` → `src/components/**`, `src/features/*/components/**`
  - `docs/02-design-system.md` e `docs/03-telas-e-navegacao.md` → estilos e telas
  - `docs/10-e2e-maestro.md` → testIDs e `.maestro/**`
- Só aponte um problema depois de confirmar no código. Se depender de algo que você não viu, abra o arquivo e confira; na dúvida, não comente.

## 3. O que verificar

### Dinheiro e regras de negócio (bloqueante quando errar)
- Valores são **inteiros em centavos** (`Cents`). Nada de `parseFloat`, `toFixed`, divisão sem `Math.floor`, ou reais em lógica. Conversão para reais só na exibição (`formatBRL`).
- Divisão: a soma das cotas é **exatamente** o total; o resto vai 1 centavo por vez aos primeiros, na ordem de entrada (`splitEvenly`). Não reimplemente fora de `src/domain`.
- Status de despesa é **derivado** das cotas (`status.ts`), nunca guardado à parte. Rótulos vêm de `expenseStatusLabel` / `shareStatusLabel`, sem strings duplicadas.
- O participante "eu" (`is_self`) aparece como "Você", não entra na aba Participantes nem na contagem do Resumo.
- Regra nova ou alterada em `src/domain` **sem teste alterado junto** → bloqueante.

### Camadas e dependências
- Rotas em `src/app/` são finas: sem `data.*`, sem cálculo, sem regra. Só compõem hooks e componentes.
- Dados só pelo contrato: `import { data } from '@/data'`. Import de `src/data/mock` fora de `src/data` → bloqueante. Exceção: infraestrutura de teste (`src/test/**`, `**/__tests__/**`).
- `src/domain` é puro: não importa `@/data`, React, React Query nem nada de UI.
- `src/components/ui` é genérico: não importa features, hooks de dados nem navegação.
- Entre features, só `api.ts` / `hooks.ts` da outra feature, nunca componentes internos.
- Mudou `DataSource` (`src/data/types.ts`)? Comentários do contrato, `src/test/data-source-contract.ts` e o mock foram atualizados? Erros são `DataError`?

### React Query
- Chaves novas em `queryKeys`, sem mudar as existentes.
- Toda mutation declara o que invalida; a tabela de invalidação em `docs/01` acompanha.
- Hooks recebem só o que usam (`Pick<>`), um hook por operação.

### Componentes e estilo
- Nível atômico certo e imports só de níveis abaixo; import sempre de `@/components/ui`.
- Estilos só por tokens de `@/theme`. Cor hex, tamanho ou fonte literal num componente → apontar.
- Átomo recriado dentro de uma feature em vez de reutilizado.
- Props de slot ou estado compartilhado entre partes → deveria ser compound? Compound segue o molde (Context + guarda + `useMemo` + `Object.assign` + teste).
- **testIDs usados pelo Maestro não podem sumir nem mudar** sem atualizar `.maestro/`. Confira com `grep -rn "<testID>" .maestro`.
- Botões só com ícone têm `accessibilityLabel`.
- Variações por `if`/ternário sobre status, variante ou tipo → preferir `Record<…>` (O do SOLID).

### Expo e plataforma
- Nada editado à mão em `ios/` ou `android/` (são gerados). Mudança nativa vai em `app.json` ou config plugin.
- Dependência nova adicionada com `npx expo install`, versão compatível com o SDK do `package.json`. Lib com código nativo → avisar que precisa de dev build.
- Sheets: rota `presentation: 'formSheet'` registrada em `src/app/(app)/_layout.tsx`, sem header nativo e sem `flex: 1` junto de `fitToContents`.

### Segurança e robustez
- Segredo, token ou `.env*.local` no código ou em log.
- Dado sensível em `AsyncStorage` (tokens vão para `expo-secure-store` quando houver backend).
- Erro engolido (`catch` vazio), promessa sem tratamento, estado de loading ou erro faltando em tela que busca dados.

### Docs
- Mudou algo que um doc descreve (regra, contrato, tabela de componentes, rotas)? O doc foi atualizado no mesmo PR?

## 4. O que NÃO comentar
- O que typecheck, lint ou testes já pegam, e formatação.
- Gosto pessoal sem regra do projeto por trás.
- Código que o PR não tocou, exceto quando o PR quebra algo nele.
- Elogios linha a linha. Um parágrafo de resumo basta.

## 5. Severidade
- 🔴 **Bloqueante**: bug, regra de dinheiro ou de negócio errada, violação de camada, contrato quebrado, testID do E2E quebrado, segurança.
- 🟡 **Importante**: viola convenção do projeto, falta teste ou doc que a regra exige.
- 🔵 **Sugestão**: melhoria opcional. No máximo 3 por review.

Cada achado: **onde** (arquivo:linha), **o quê**, **por quê** (cite a regra ou o doc) e **como corrigir**, com o trecho corrigido quando couber.

## 6. Entregue

### Modo CI
1. Um comentário inline por achado com `mcp__github_inline_comment__create_inline_comment`, sempre com `confirmed: true`, na linha do lado novo (`side: RIGHT`). Use bloco ```` ```suggestion ```` só quando a troca for completa e válida para as linhas selecionadas.
2. No fim, um único comentário de resumo com `gh pr comment <número> --body "..."`, neste formato:

```
## Code review · TaskCost Split

**Veredito:** ✅ Pode seguir | ⚠️ Pode seguir após ajustes | ⛔ Precisa de mudanças

| Severidade | Qtde |
|---|---|
| 🔴 Bloqueante | N |
| 🟡 Importante | N |
| 🔵 Sugestão | N |

<2 a 4 frases: o que o PR faz e o ponto mais importante do review>

<lista curta dos achados bloqueantes e importantes, com link para o arquivo>
```

Veredito: ⛔ se houver algum 🔴; ⚠️ se houver 🟡; ✅ caso contrário. Sem achados → só o resumo com ✅.

### Modo local
Responda no chat com o mesmo resumo e a lista de achados agrupada por severidade (arquivo:linha, o quê, por quê, como corrigir). **Não altere arquivos**; ofereça corrigir os achados depois.
