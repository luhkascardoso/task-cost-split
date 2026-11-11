# Backend · 04 · Autenticação e segurança

Como a sessão funciona, quem pode o quê e as defesas da API. Decisão de usar auth própria em [ADR 0005](adr/0005-autenticacao-propria.md).

## Sessão

1. **Cadastro e login** devolvem dois tokens:
   - `accessToken`: JWT HS256 com `sub` (id do usuário), `iat` e `exp` em **15 min**, sem nenhum outro dado;
   - `refreshToken`: 32 bytes aleatórios (`crypto.randomBytes`) em base64url, válido por **30 dias**.
2. O app guarda os dois no **`expo-secure-store`** e manda `Authorization: Bearer <accessToken>`.
3. Com `401`, o app chama `POST /v1/auth/refresh` **uma vez** (as requisições simultâneas esperam esse mesmo refresh) e repete a requisição. Se o refresh falhar, a sessão acaba e o app volta ao login.
4. **Rotação:** cada refresh revoga o token usado (`revoked_at`, `replaced_by_id`) e emite outro da mesma **família** (`family_id`, uma por login).
5. **Detecção de reuso:** se chegar um refresh token já revogado (o original e o ladrão usando o mesmo token), toda a família é revogada e a resposta é `401`. Os dois precisam entrar de novo.
6. **Saída:** `sign-out` revoga a família do token enviado; o app apaga os tokens e limpa o cache (`queryClient.clear()`).

| Detalhe | Decisão |
|---|---|
| Segredo do JWT | `JWT_SECRET` com pelo menos 32 bytes aleatórios; trocar invalida todos os tokens de acesso (é o "logout geral" de emergência) |
| Armazenamento do refresh | Só o **SHA-256** do token. Token de alta entropia não precisa de hash lento; o banco vazado não dá sessão a ninguém |
| Relógio | Validação do JWT com tolerância de 30 s; o relógio entra por `deps.clock` para os testes |
| Verificação | Plugin `auth` com `@fastify/jwt`; `app.authenticate` como `preHandler` em toda rota fora de `auth` e `/health` |

## Senhas e contas

- Hash com **argon2id** (`argon2`), parâmetros mínimos da OWASP: memória 19 MiB, 2 iterações, paralelismo 1. O hash guarda os parâmetros, então subir o custo depois não quebra as senhas antigas.
- E-mail normalizado (`trim` + minúsculas) antes de gravar e de buscar.
- Senha de 6 a 128 caracteres (paridade com o app; ver [02 · Limites](02-api.md#limites-de-entrada)).
- Login com e-mail ou senha errados: **uma só mensagem** ("E-mail ou senha incorretos") e o mesmo tempo de resposta (o hash é verificado mesmo quando o e-mail não existe, contra um hash fixo).
- Cadastro com e-mail já usado responde `409 conflict`. Isso revela que o e-mail tem conta; é o mesmo comportamento do app hoje, e o rate limit do cadastro limita a enumeração.
- Recuperação de senha e confirmação de e-mail ficam fora da v1.

## Autorização

- **v1:** só o dono lê e altera os próprios dados ([03 · Escopo do dono](03-dados.md#escopo-do-dono)). Recurso de outro usuário responde **`404`**, não `403`, para não revelar que existe.
- **Fase 6 (vínculo):** quem está vinculado a um participante **lê** a atividade e **marca a própria cota**; editar e excluir continuam só com o dono. Aí entra o `403` para "vê, mas não pode alterar".
- A regra fica no serviço, como função pura testável (`canEditActivity(viewer, activity)`), não espalhada pelas rotas.

## Defesas da API

| Defesa | Configuração |
|---|---|
| Rate limit (`@fastify/rate-limit`) | Login: 5 por minuto por IP + e-mail. Cadastro: 10 por hora por IP. Refresh: 30 por minuto por IP. Demais rotas: 120 por minuto por usuário |
| Tamanho do corpo | `bodyLimit` de 100 KB |
| Validação estrita | Zod com objetos estritos: campo desconhecido é recusado (evita *mass assignment*, como enviar `ownerId`) |
| Resposta filtrada | Schema de resposta em toda rota: `password_hash`, `owner_id` e tokens nunca saem por acidente |
| CORS (`@fastify/cors`) | O app nativo não usa CORS. Só as origens de `CORS_ORIGINS` (o Expo web em desenvolvimento); vazio em produção |
| Headers (`@fastify/helmet`) | Padrão do helmet para respostas JSON; desligar só o que quebrar o `/docs` |
| Erros | Nunca stack, SQL ou mensagem do Prisma na resposta ([02 · Erros](02-api.md#erros)) |
| Proxy | `trustProxy` ligado só atrás do Render, para o IP do rate limit ser o do cliente |

## Supabase

O Supabase é usado **só como Postgres** ([ADR 0003](adr/0003-prisma-e-postgres-no-supabase.md)). O risco específico dele: o projeto expõe o schema `public` por uma API REST automática, acessível com a chave anônima.

- Tabelas no schema **`app`**, que não está entre os schemas expostos pela API do Supabase (confira em *Settings → API → Exposed schemas* que só aparece o que o projeto precisa).
- **RLS ligado em toda tabela, sem políticas:** se o schema for exposto por engano, ninguém lê nada pela API do Supabase.
- O servidor conecta com o usuário do banco pela connection string (pooler), nunca com as chaves `anon` ou `service_role`, que nem entram nas variáveis do servidor.

## Segredos e dados pessoais

- Segredos só nas variáveis do Render e do GitHub Actions. No repositório, só `server/.env.example` com valores falsos.
- O `redact` do logger cobre `authorization`, `password`, `refreshToken`, `accessToken` e `password_hash` ([01 · Logs](01-arquitetura.md#logs)).
- Nada de dado pessoal (e-mail, nome, valores) em mensagens de erro do servidor, métricas ou eventos do Sentry (LUH-15).

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| API do Supabase expondo tabelas | Schema `app` + RLS sem políticas + sem chaves do Supabase no servidor |
| Senha vazada do banco | argon2id; tokens de refresh só como hash |
| Força bruta no login | Rate limit por IP e e-mail; mensagem e tempo únicos |
| Token de acesso roubado | Vale 15 min; nada além do id no payload |
| Refresh roubado | Rotação com detecção de reuso revoga a família |
| Dados de outro usuário | Escopo do dono em todo repositório; `404`; teste "de outro usuário" em toda rota |
| Dados pessoais em log | `redact` no logger; corpo de requisição não é logado |
| Segredo no repositório | Só `.env.example`; scanner de segredos do GitHub ligado (`setup-repo-security.sh`) |

## OWASP API Security Top 10 (2023)

| Risco | Onde é tratado |
|---|---|
| API1 · Autorização em nível de objeto (BOLA) | Escopo do dono; teste "recurso de outro usuário → 404" em toda rota |
| API2 · Autenticação quebrada | JWT curto, refresh rotativo com reuso detectado, argon2id, rate limit no login |
| API3 · Autorização em nível de propriedade | Corpo estrito na entrada; schema de resposta na saída |
| API4 · Consumo de recursos sem limite | Rate limit, `bodyLimit`, limites de campos e de `participantIds` |
| API5 · Autorização em nível de função | v1 sem papéis; fase 6 com regra no serviço e `403` testado |
| API6 · Fluxos de negócio sensíveis | Rate limit no cadastro; idempotência nas criações |
| API7 · SSRF | A API não faz requisição para URL vinda do cliente |
| API8 · Configuração insegura | `env` validado na subida; helmet; CORS fechado em produção; sem stack nas respostas |
| API9 · Inventário | Uma versão (`/v1`), OpenAPI gerado das rotas, tabela única em [02](02-api.md#rotas) |
| API10 · Consumo inseguro de APIs | Sem APIs de terceiros na v1; o Sentry (LUH-15) só recebe dados filtrados |
