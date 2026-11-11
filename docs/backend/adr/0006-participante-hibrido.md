# ADR 0006 · Participante híbrido: nome do dono, vinculável a uma conta

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

No app, participante é só um nome na lista do usuário: ninguém precisa de conta para entrar numa despesa. A referência usa só contas de usuário. Queremos, no futuro, que a outra pessoa veja as despesas em que aparece.

## Decisão

Todo participante pertence a um dono (`owner_id`) e tem um `user_id` opcional. O "eu" é o participante com `is_self` vinculado ao próprio dono. Na v1 não há fluxo de vínculo; o modelo já suporta a fase 6 sem migração destrutiva.

## Consequências

- Comportamento da v1 idêntico ao do app hoje.
- `isSelf` na resposta é calculado para quem pede (participante vinculado à conta logada), não lido da coluna.
- A fase 6 traz permissões de leitura compartilhada, o `403` e telas de convite.

## Alternativas

- **Só nomes (como o app):** mais simples, mas compartilhar exigiria migrar o modelo depois.
- **Só contas (como a referência):** obriga todo mundo a ter conta para entrar numa despesa.
