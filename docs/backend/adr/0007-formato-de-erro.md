# ADR 0007 · Formato único de erro e `404` para recurso de outro usuário

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

O app já trata tudo como `DataError` com `code` e mostra a mensagem com `errorMessage`. O adaptador HTTP precisa converter respostas de erro sem adivinhar.

## Decisão

- Toda resposta de erro é `{ "error": { "code", "message" } }`, com `code` de `DataErrorCode` e mensagem em português pronta para a tela.
- Recurso que não existe **ou** é de outro usuário responde `404 not_found`. Não usamos `403` na v1.
- Detalhe técnico (stack, SQL, Prisma) só no log, ligado ao `x-request-id` da resposta.

## Consequências

- O adaptador HTTP converte direto para `DataError(message, code)`.
- Não dá para descobrir ids de outros usuários testando respostas (proteção contra BOLA, API1 da OWASP).
- As mensagens moram no servidor; mudar um texto não exige versão nova do app.

## Alternativas

- **RFC 9457 (Problem Details):** padrão, mas mais campos do que o app usa; pode ser adotado em `/v2` mantendo `code` e `message`.
- **`403` para recurso alheio:** mais "correto" semanticamente, mas revela que o recurso existe.
