# ADR 0004 · O servidor importa `src/domain` do app

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

As regras de dinheiro (divisão com resto, status derivado, resumo, validação) já existem, testadas, em `src/domain`. A referência em Swift reimplementou a divisão e perde centavos.

## Decisão

O servidor importa `src/domain` (e `src/lib/errors.ts`) por caminho (`@/domain`, `@/lib/errors`). O `tsup` embute esse código no `dist/` do servidor. Nenhuma regra de dinheiro é escrita no `server/`.

## Consequências

- Uma regra muda num lugar e vale no app e no servidor no mesmo PR.
- `src/domain` precisa continuar puro (sem React, Expo, IO). O ESLint do servidor bloqueia qualquer outro import do app.
- O servidor e o app compilam o domínio com configurações de TypeScript diferentes: o domínio deve usar só TypeScript padrão (sem recurso específico do Metro/Babel).
- Build do servidor depende da raiz do repositório (contexto do Docker).

## Alternativas

- **Copiar o domínio para o servidor:** diverge na primeira mudança.
- **Pacote `@taskcost/domain` publicado ou em workspace:** correto, mas exige a reestruturação descrita no [ADR 0001](0001-server-no-mesmo-repositorio.md).
