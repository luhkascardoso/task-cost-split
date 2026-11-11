# ADR 0003 · Prisma 7 + Postgres no Supabase (só como banco)

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

Precisamos de um banco relacional (atividades, despesas e cotas têm relações e invariantes), gratuito para começar, com migrations versionadas e legíveis por pessoas e agentes.

## Decisão

- **Postgres no Supabase**, usado **só como banco**: sem Supabase Auth, sem API REST do Supabase, sem chaves `anon`/`service_role` no servidor.
- Tabelas no schema `app` com RLS ligado e sem políticas ([04 · Supabase](../04-autenticacao-e-seguranca.md#supabase)).
- **Prisma 7** para schema, migrations e client: `prisma.config.ts` com a URL direta (CLI) e o driver adapter `@prisma/adapter-pg` com a URL do pooler (servidor).

## Consequências

- O banco pode trocar de provedor (Neon, RDS, Postgres próprio) trocando só as URLs.
- Migrations em SQL versionado e revisável no PR.
- O Prisma não expressa tudo no schema (`CHECK`, índice parcial, RLS): isso vai à mão no SQL da migration, e a skill `backend-migration` lembra.
- Cuidado conhecido: coluna `@db.Date` volta como `Date` em UTC ([03 · Convenções do Prisma](../03-dados.md#convenções-do-prisma)).

## Alternativas

- **Supabase completo (Auth + PostgREST + RLS com políticas):** menos código, mas a regra de negócio (divisão, idempotência) teria de ir para SQL/Edge Functions, longe de `src/domain`, e o app ficaria preso ao Supabase.
- **Drizzle:** mais próximo do SQL e leve; o Prisma foi escolhido pelo schema declarativo, mais fácil de revisar, e pela experiência da referência.
- **SQLite:** simples, mas sem hospedagem gerenciada gratuita equivalente e com diferenças de tipos em relação ao Postgres de produção.
