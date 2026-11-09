# 06 · Convenções

## Código

- **TypeScript strict** com `noUncheckedIndexedAccess`. Evite `any`. Use `as unknown as T` só em casos muito específicos.
- Imports absolutos com `@/` (ex.: `@/components/ui`).
- **Idioma:** código em inglês (nomes, rotas, tabelas). Textos de UI, comentários de regra de negócio e docs em português.
- Componentes: `PascalCase.tsx`, um por arquivo, export nomeado. A exceção são as rotas, que usam `export default`.
- Telas em `src/app/` ficam **finas**: compõem componentes e chamam hooks. Lógica de negócio vai em `domain/` e acesso a dados em `features/*/api.ts`.
- Comente cada tela com o node do Figma correspondente (`/** Figma: … (5108:890) */`).
- Use `Text` de `@/components/ui` em vez de `Text` do RN, para que só estilos do Figma sejam usados.
- Listas usam `FlatList` com item `memo`izado e callbacks estáveis (`useCallback`).
- O lint (`eslint-config-expo`) inclui as regras do React Compiler. Exemplo: prefira `useWatch({ control, name })` a `watch()` do react-hook-form.

## Dados

- Cada feature expõe **hooks** (`useActivities`, `useSaveExpense`…). Telas e hooks nunca importam uma implementação concreta (`data/mock`, `data/http`): só `data` de `@/data`.
- Chaves de cache só via `queryKeys` (`src/lib/query-client.ts`).
- Toda mutation declara o que invalida. Mantenha a tabela de [01](01-arquitetura.md#cache-e-invalidação) atualizada.
- A fonte de dados devolve **modelos de domínio** (camelCase, `Cents`). Conversões de formato de API (snake_case etc.) ficam dentro do adaptador, em `src/data/<impl>/`.
- Precisa de uma operação nova? Adicione no contrato (`src/data/types.ts`), implemente no mock, escreva o teste e atualize [04](04-camada-de-dados.md).
- Formulários: um schema Zod em `features/*/schemas.ts` + `useForm({ resolver: zodResolver(schema) })` + `FormInput`.

## Princípios de design (SOLID)

Todo código novo segue [11 · SOLID](11-solid.md) e, para componentes, [12 · Atomic Design e Compound](12-atomic-design-e-compound.md). Para criar uma feature, use o **checklist de feature nova** de lá. Para revisar, use o **checklist de PR**.

## Receitas

### Adicionar uma tela

1. Crie o arquivo em `src/app/...`. O caminho vira a rota.
2. Se for um sheet, registre em `(app)/_layout.tsx` com `options={sheet}`.
3. Use `Screen` (tela cheia) ou `Sheet` (sheet) como container.
4. Navegue com `router.push({ pathname: '/rota/[param]', params })`. As typed routes validam em tempo de compilação.
5. Atualize [03 · Telas](03-telas-e-navegacao.md).

### Adicionar uma query ou mutation

1. Em `features/<feature>/api.ts`, crie `useAlgo()` com `useQuery`/`useMutation`.
2. Adicione a chave em `queryKeys`, se for nova.
3. Mapeie a resposta para tipos de domínio.
4. Em mutations, use `onSuccess` para invalidar as chaves afetadas.

### Adicionar uma regra de negócio

1. Escreva o teste em `src/domain/__tests__/`.
2. Implemente uma função pura em `src/domain/` e exporte em `index.ts`.
3. Documente em [05 · Regras](05-regras-de-negocio.md).

### Adicionar um componente

Siga a receita de [12 · Atomic Design e Compound](12-atomic-design-e-compound.md#receita-criando-um-componente). Em resumo:

1. Confira o componente no Figma (`get_design_context` pelo MCP do Figma).
2. Escolha o nível (átomo, molécula, organismo, template) e se é genérico (`src/components/ui/<nível>/`) ou de feature (`src/features/*/components/`).
3. Estado compartilhado entre partes ou estrutura variável → **compound** (Context + `Object.assign`). Senão, props simples.
4. Use **só** tokens do `@/theme` e peças dos níveis de baixo.
5. Exporte em `components/ui/index.ts` (na seção do nível) e adicione ao mapa em [02](02-design-system.md).

### Adicionar uma dependência

Use sempre `npx expo install <pkg>`, que resolve a versão compatível com o SDK. Libs com código nativo exigem um development build (veja [07](07-setup.md)).

## Antes de abrir PR

```bash
npm run typecheck && npm run lint && npm test
```
