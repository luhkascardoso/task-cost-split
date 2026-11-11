# ADR 0008 · Testes de API contra Postgres real

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

Os bugs que mais importam no backend estão na fronteira com o banco: escopo do dono esquecido numa consulta, transação parcial, data em fuso errado, `CHECK` faltando. Mock de Prisma não pega nenhum deles.

## Decisão

Os testes do servidor chamam as rotas com `app.inject()` contra um Postgres real (Docker local, serviço no CI), com as migrations aplicadas e as tabelas limpas antes de cada teste. Sem mock de Prisma nem de repositório. Casos obrigatórios por rota em [05 · Testes](../05-testes.md#casos-obrigatórios-por-rota).

## Consequências

- O teste prova o comportamento que o app vai ver, incluindo migrations e constraints.
- A suíte é mais lenta que testes unitários e roda em série; aceitável no tamanho da v1, com a saída (schema por worker) documentada.
- Precisa de Docker localmente.

## Alternativas

- **Mock do Prisma / repositórios falsos:** rápido, mas testa a implementação, não o comportamento.
- **SQLite em memória:** diferente do Postgres em tipos, `CHECK`, índices parciais e schemas.
- **Testcontainers:** isolamento por suíte sem Docker Compose; pode substituir o Compose se a configuração local virar problema.
