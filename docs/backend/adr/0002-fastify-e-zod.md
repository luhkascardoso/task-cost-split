# ADR 0002 · Fastify + Zod para a camada HTTP

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

A API precisa de validação de entrada e saída, tipos derivados dos mesmos schemas e documentação OpenAPI sem trabalho manual. O app já usa Zod nos formulários.

## Decisão

Fastify 5 com `@fastify/type-provider-zod` e Zod 4. Cada rota declara schemas Zod de params, query, corpo e **resposta**; o OpenAPI sai de `@fastify/swagger` com `jsonSchemaTransform`.

## Consequências

- Os tipos do handler vêm do schema; não há DTO escrito duas vezes.
- O schema de resposta filtra o que sai (proteção contra vazar campo interno) e é tipado contra o tipo do domínio.
- O sistema de plugins do Fastify organiza auth, erros e rate limit sem middleware global confuso.
- A equipe precisa conhecer o encapsulamento de plugins do Fastify (decorators e hooks valem dentro do escopo onde foram registrados).

## Alternativas

- **Express:** mais conhecido, mas sem validação nem tipos por rota nativos; tudo seria montado à mão.
- **NestJS:** estrutura pronta, mas pesado (decorators, DI própria) para uma API deste tamanho, e distante do estilo funcional do app.
- **Hono:** leve e tipado, bom para edge; o ecossistema de plugins (rate limit, swagger, jwt) do Fastify é mais maduro para um servidor Node.
