# ADRs do backend

Um ADR (*Architecture Decision Record*) registra **uma** decisão de arquitetura: o contexto, o que foi decidido, as consequências e as alternativas descartadas. Serve para quem chega depois (pessoa ou agente) entender **por que** algo é como é antes de mudar.

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-server-no-mesmo-repositorio.md) | Servidor no mesmo repositório (`server/`) | Aceito |
| [0002](0002-fastify-e-zod.md) | Fastify + Zod para a camada HTTP | Aceito |
| [0003](0003-prisma-e-postgres-no-supabase.md) | Prisma 7 + Postgres no Supabase (só como banco) | Aceito |
| [0004](0004-dominio-compartilhado.md) | O servidor importa `src/domain` do app | Aceito |
| [0005](0005-autenticacao-propria.md) | Autenticação própria com JWT curto e refresh rotativo | Aceito |
| [0006](0006-participante-hibrido.md) | Participante híbrido: nome do dono, vinculável a uma conta | Aceito |
| [0007](0007-formato-de-erro.md) | Formato único de erro e `404` para recurso de outro usuário | Aceito |
| [0008](0008-testes-contra-postgres-real.md) | Testes de API contra Postgres real | Aceito |
| [0009](0009-idempotencia.md) | `Idempotency-Key` nas criações | Aceito |

## Quando escrever

- Escolha de tecnologia, formato ou padrão que outras partes vão seguir.
- Decisão difícil de desfazer (modelo de dados, auth, contrato da API).
- Mudança de uma decisão já registrada.

Escolha local e fácil de trocar (nome de variável, biblioteca de utilidade) não precisa de ADR.

## Como escrever

1. Copie o formato de um ADR existente: título, status, data, card, **Contexto**, **Decisão**, **Consequências** (boas e ruins) e **Alternativas**.
2. Use o próximo número livre e um nome curto em `kebab-case`.
3. ADR aceito não é reescrito. Para mudar a decisão, crie um ADR novo com `Substitui: ADR NNNN` e marque o antigo como `substituído por ADR MMMM`.
4. Atualize a tabela acima e a de [Decisões](../../15-backend.md#decisões) no mesmo PR.
