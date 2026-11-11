# ADR 0009 · `Idempotency-Key` nas criações

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

Escrita repetida é dinheiro duplicado ([05 · Dinheiro e duplicidade](../../05-regras-de-negocio.md#dinheiro-e-duplicidade)). O app não repete escritas sozinho, mas a rede pode cair depois de o servidor gravar e antes de a resposta chegar, e o usuário tenta de novo.

## Decisão

Rotas de criação aceitam o header `Idempotency-Key`. O servidor guarda `(user_id, key)`, o hash da requisição e a resposta, na mesma transação da criação, por 24 h. Reenvio igual devolve a resposta guardada; mesma chave com outro corpo dá `409`. Fluxo em [02 · Idempotência](../02-api.md#idempotência).

## Consequências

- Reenvio depois de queda de rede não duplica atividade, despesa nem participante.
- O app gera uma chave por operação (não por tentativa) e a reaproveita no "tentar de novo".
- Uma tabela a mais, com limpeza periódica.

## Alternativas

- **Id gerado pelo cliente (UUID no corpo):** também idempotente, mas mistura identidade do recurso com controle de reenvio e confia no cliente para gerar ids.
- **Deduplicação por conteúdo (mesmo título e valor em X segundos):** bloquearia duas despesas legítimas iguais.
