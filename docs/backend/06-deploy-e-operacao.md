# Backend · 06 · Deploy e operação

Ambientes, variáveis, imagem, pipeline de deploy e runbook. Implementado na fase 5 (LUH-10); monitoramento no LUH-15.

## Ambientes

| Ambiente | API | Banco | App |
|---|---|---|---|
| Local | `npm run dev` (`tsx watch`) na porta 3333 | Postgres do `docker-compose.yml` | `EXPO_PUBLIC_DATA_SOURCE=mock` (padrão) ou `http` com `EXPO_PUBLIC_API_URL=http://<ip-da-máquina>:3333` |
| CI | `app.inject()`, sem porta | Serviço `postgres` do job | — |
| Produção | Render (web service, Docker) | Supabase (Postgres, schema `app`) | Perfis `preview` e `production` do EAS com `EXPO_PUBLIC_DATA_SOURCE=http` |

Não há homologação separada na v1. Antes de expor para outras pessoas, o perfil `preview` do EAS aponta para a mesma API.

## Variáveis de ambiente

Validadas por `src/env.ts` na subida ([01 · Configuração](01-arquitetura.md#configuração)). `server/.env.example` lista todas, com valores falsos.

| Variável | Exemplo | Uso |
|---|---|---|
| `NODE_ENV` | `production` | `development` liga logs legíveis e o seed |
| `PORT` | `3333` | O Render injeta a dele |
| `DATABASE_URL` | `postgresql://…pooler.supabase.com:6543/postgres` | Conexão do **servidor**, pelo pooler (modo transação) |
| `DIRECT_URL` | `postgresql://…supabase.co:5432/postgres` | Conexão **direta**, só para a CLI do Prisma (migrations) no `prisma.config.ts` |
| `JWT_SECRET` | 32+ bytes aleatórios | Assinatura do token de acesso |
| `CORS_ORIGINS` | vazio | Origens permitidas, separadas por vírgula (só Expo web em dev) |
| `LOG_LEVEL` | `info` | `debug` só localmente |
| `SENTRY_DSN` | — | LUH-15; vazio desliga |

As URLs do banco nunca vão para o app nem para logs. O `JWT_SECRET` de produção só existe no Render.

## Build e imagem

- `server/Dockerfile` em **várias etapas**: instala, gera o Prisma Client, empacota com `tsup` e copia só `dist/`, o client gerado e as dependências de produção para a imagem final.
- O **contexto de build é a raiz do repositório** (`docker build -f server/Dockerfile .`), porque o `tsup` embute `src/domain` e `src/lib/errors.ts` ([01 · Domínio compartilhado](01-arquitetura.md#domínio-compartilhado)). Um `.dockerignore` na raiz deixa de fora `node_modules`, `assets`, `docs` e o resto do app.
- Roda como usuário sem privilégio, em `node:22-slim`, com `HEALTHCHECK` no `/health`.
- `server.ts` trata `SIGTERM`: para de aceitar conexões, espera as requisições em andamento (até 10 s) e fecha o Prisma.

## Pipeline de deploy

Migration **antes** do código novo, sempre pelo GitHub Actions, não pelo Render:

```
merge na main (muda server/**, src/domain/** ou src/lib/errors.ts)
  └─ workflow server-deploy.yml
       1. job "server" do CI verde (mesmo commit)
       2. prisma migrate deploy  (DIRECT_URL do secret do ambiente "production")
       3. aciona o deploy hook do Render (RENDER_DEPLOY_HOOK)
       4. espera /health/ready responder 200 com a versão nova (até 5 min)
```

- O auto-deploy do Render fica **desligado**: quem decide a ordem é o workflow. Assim a migration nunca roda depois do código que precisa dela.
- O ambiente `production` do GitHub guarda `DIRECT_URL` e `RENDER_DEPLOY_HOOK`; o workflow só roda na `main`.
- Por causa do **expand/contract** ([03 · Migrations](03-dados.md#migrations)), a migration nunca quebra o código que ainda está no ar.
- `/health` devolve o commit (`version`) para o passo 4 confirmar que a versão nova subiu.

## Limites do plano gratuito

| Serviço | Limite | Efeito |
|---|---|---|
| Render (Free) | O serviço [dorme após 15 min sem tráfego](https://render.com/docs/free) e leva cerca de 1 min para acordar; 750 horas por mês | A primeira requisição depois de um tempo parado pode dar `timeout` no app. A leitura é repetida (até 2 vezes); a escrita mostra erro e o usuário tenta de novo. Para uso real, um plano pago resolve |
| Supabase (Free) | Projeto pausa após um período sem uso; limites de tamanho e conexões | Reativar no painel. Conferir os limites do plano na fase 5 |

## Observabilidade

| O quê | Onde |
|---|---|
| Logs da API (JSON, com `requestId`) | Painel do Render |
| Saúde | `/health` (processo) e `/health/ready` (banco); o Render usa o `/health` |
| Erros e alertas | Sentry, no LUH-15 |
| Lento ou banco | Logs com o tempo de cada requisição; *Query Performance* do Supabase |

## Runbook

**Deploy:** acontece sozinho no merge. Para acompanhar: Actions → `server-deploy`. Se falhar no passo 2, nada mudou no ar.

**Rollback do código:** no Render, *Rollback* para o deploy anterior. É seguro porque as migrations são expand/contract: o código anterior continua compatível com o banco.

**Migration falhou no meio:**
1. O passo 3 não roda; a versão antiga segue no ar.
2. Veja o erro no log do workflow e o estado em `_prisma_migrations` (coluna `finished_at` vazia).
3. Corrija com uma migration nova; se a falha deixou estado parcial, marque a migration com `prisma migrate resolve --rolled-back <nome>` depois de desfazer o parcial à mão, registrando no PR o que foi feito.

**Segredo vazado:**
- `JWT_SECRET`: gere outro no Render e reinicie. Todos os tokens de acesso caem; as sessões voltam pelo refresh.
- Refresh tokens comprometidos: revogue tudo (`UPDATE app.refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL`). Todos precisam entrar de novo.
- Senha do banco: troque no Supabase e atualize `DATABASE_URL` (Render) e `DIRECT_URL` (GitHub).

**API lenta ou fora:** `/health` responde? Se não, veja o Render (o serviço dormiu, o deploy falhou, faltou memória). Se só o `/health/ready` falha, é o banco: veja se o projeto do Supabase está pausado ou no limite de conexões.

**Backup:** confira na fase 5 o que o plano do Supabase oferece. Se não houver backup automático, um workflow semanal faz `pg_dump` do schema `app` para um armazenamento privado com criptografia. O dump tem dados pessoais e nunca vai para artefato público do GitHub.
