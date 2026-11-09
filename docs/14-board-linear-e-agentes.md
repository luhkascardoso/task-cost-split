# 14 · Board (Linear) e agentes

O board do projeto é o **Linear** (workspace `luhkas27`, time **LUH**). Código, CI e code review continuam no **GitHub**. Este doc define como os dois se conversam e como agentes de IA pegam trabalho do board:

- **Passo 2 · Agente na nuvem:** uma issue com a label `agente` no Linear vira um PR aberto por um agente no GitHub, sem ninguém rodar nada na máquina.
- **Passo 3 · Claude Code local:** no seu computador, o Claude Code lê e atualiza o board pelo MCP oficial do Linear ("pega o próximo card de Todo").

Nos dois casos o PR passa pelos mesmos gates: CI (`checks`), code review (`review`) e o merge feito por uma pessoa ([13 · IA no desenvolvimento](13-ia-no-desenvolvimento.md)).

> **Situação:** implementado (`.github/workflows/agent-issue.yml`, `.github/scripts/agent-*.sh`, `.mcp.json`, permissões em `.claude/settings.json`). Falta a configuração única em [Ativar](#ativar) e confirmar no primeiro uso os itens de [O que validar](#o-que-validar-na-implementação).

## Visão geral

```
                LINEAR (time LUH)                              GITHUB (task-cost-split)
 ┌─────────────────────────────────────┐            ┌──────────────────────────────────────────┐
 │ Issue LUH-12  + label "agente"      │──sync────▶ │ Issue #N  + label "agente"               │
 │                                     │  (2 vias)  │   │                                      │
 │                                     │            │   ▼ workflow agent-issue.yml (passo 2)   │
 │                                     │            │ Claude implementa na branch              │
 │                                     │            │ agente/luh-12-… e abre PR:               │
 │ Status ◀── automação do Linear ─────│◀───────────│   "Fixes LUH-12" + "Closes #N"           │
 │  In Progress → In Review → Done     │            │   │                                      │
 │                                     │            │   ▼ checks (CI) + review (IA) + merge    │
 └─────────────────────────────────────┘            └──────────────────────────────────────────┘
          ▲
          │ MCP do Linear (passo 3)
 ┌────────┴────────────────────┐
 │ Claude Code no seu Mac      │── branch luh-12-… ── PR ──▶ mesmos gates
 └─────────────────────────────┘
```

## Ativar

Uma vez, nesta ordem:

1. **Linear:** a configuração de [Pré-requisitos no Linear](#pré-requisitos-no-linear) (sincronização de duas vias, automações de status, label `agente`).
2. **App do Claude no GitHub** instalado no repositório (no Claude Code: `/install-github-app`). Sem ele o PR do agente não dispara CI nem review.
3. **Variável do repositório** `AGENT_ALLOWED_SENDERS` (Settings → Secrets and variables → Actions → Variables): logins que podem acionar o agente, separados por vírgula, com o bot do Linear. Exemplo: `luhkascardoso,linear[bot]`. Sem a variável, só o dono do repositório aciona. `*` é recusado.
4. Opcional: variável `LINEAR_TEAM_KEY` se o time mudar de `LUH`.
5. **Teste:** crie no Linear uma issue pequena com critérios de aceite claros, aplique `agente` e acompanhe em Actions → "Agente (issues)". O primeiro uso confirma os itens de [O que validar](#o-que-validar-na-implementação).

Para o passo 3, basta abrir o Claude Code no projeto, aprovar o servidor `linear` do `.mcp.json` e rodar `/mcp` para entrar no Linear.

## Pré-requisitos no Linear

Feitos uma vez, nas configurações do time **LUH**:

| Configuração | Onde | Valor |
|---|---|---|
| Integração GitHub | Integrações do workspace | Conectada ao repositório `luhkascardoso/task-cost-split` (feito) |
| Automação de status | Configurações do time LUH, automações de Git/PR (é por time) | PR em rascunho → **In Progress**; PR aberto → **In Review**; PR mergeado → **Done** |
| Sincronização de GitHub Issues | Integração GitHub, opção de GitHub Issues | **Duas vias** com `task-cost-split` (só um repositório por time pode ser duas vias) |
| Label `agente` | Labels do time LUH | Criar a label. Ela é sincronizada com a issue do GitHub e dispara o passo 2 |
| Nome de branch | Preferências de Git do Linear ("Copy git branch name", atalho Cmd/Ctrl + Shift + .) | Manter o ID da issue no nome (padrão do Linear). É o ID que liga a branch ao card |

O status padrão do Linear é Backlog → Todo → In Progress → In Review → Done (e Canceled). Se o time usar nomes em português, a tabela acima vale com os nomes equivalentes.

## Convenções (pessoas e agentes)

| Item | Regra | Por quê |
|---|---|---|
| Branch | Contém o ID do Linear: `luh-12-dividir-por-peso` (local) ou `agente/luh-12-dividir-por-peso` (agente na nuvem) | O Linear liga a branch ao card e move o status sozinho |
| Título do PR | Descritivo, sem prefixo obrigatório | O template de PR pede objetivo e testes |
| Descrição do PR | `Fixes LUH-12` (fecha o card no merge). Se veio de issue sincronizada, também `Closes #N` | Palavras mágicas do Linear só valem no título ou na descrição, **não** em comentários |
| Trabalho parcial | `Part of LUH-12` em vez de `Fixes` | Liga sem fechar o card no merge |
| Um card, um PR | PRs pequenos; card grande vira sub-issues no Linear | Review mais preciso e merge mais seguro |
| Quem faz o merge | **Sempre uma pessoa** | Check verde não é aprovação ([13](13-ia-no-desenvolvimento.md)) |

Palavras mágicas aceitas pelo Linear: para fechar, `fixes`, `closes`, `resolves`, `completes`, `implements` (e variações); para só referenciar, `part of`, `refs`, `contributes to`; para só relacionar, `related to`. `Ignore LUH-12` impede a ligação.

## Passo 2 · Agente na nuvem

### Fluxo

1. A issue está pronta no Linear: objetivo, critérios de aceite e regras, como no template de funcionalidade do GitHub. **Issue vaga gera PR vago.**
2. Você adiciona a label **`agente`** no Linear.
3. A sincronização de duas vias leva a label para a issue espelho no GitHub.
4. O evento `issues: labeled` dispara o workflow `.github/workflows/agent-issue.yml`, que confere quem aplicou a label (`AGENT_ALLOWED_SENDERS`), calcula a branch e roda o Claude com a mesma `claude-code-action` do review.
5. O agente:
   - lê a issue e os docs ([AGENTS.md](../AGENTS.md), 01, 04, 05, 11, 12, 13);
   - trabalha na branch `agente/luh-<n>-<resumo>`, **calculada pelo workflow** antes de o Claude rodar (`agent-branch.sh`, via `CLAUDE_BRANCH`): o agente não escolhe a branch e não commita na `main`;
   - implementa com testes, rodando `npm run check` antes de concluir (os hooks do projeto também rodam);
   - commita pela API do GitHub (`use_commit_signing`), sem `git push`;
   - abre o PR **como rascunho** usando o template, com `Fixes LUH-<n>` e `Closes #<N>`.
   - Depois do Claude, um passo fixo (`agent-outcome.sh`) **confere que o PR existe de verdade** e comenta o link na issue; senão, comenta o motivo e remove a label.
6. O Linear move o card para **In Progress** (rascunho) e depois **In Review** quando você marca o PR como pronto.
7. CI e review rodam no PR. Você lê, pede ajustes (comentando `@claude` no PR) ou faz o merge. No merge o card vai para **Done**.

### Requisitos técnicos

| Requisito | Motivo |
|---|---|
| **App do Claude no GitHub instalado** (`/install-github-app` no Claude Code, ou a página do app) | PR aberto com o `GITHUB_TOKEN` do Actions **não dispara outros workflows**: CI e review não rodariam e o merge ficaria travado. O PR precisa ser aberto com o token do app |
| Secret `CLAUDE_CODE_OAUTH_TOKEN` (ou `ANTHROPIC_API_KEY`) | O mesmo do review |
| Permissões do job: `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write` | Criar branch, abrir PR, comentar na issue e obter o token do app |
| Workflow lido da `main` | Eventos de issue usam o workflow da branch padrão: um PR não altera o agente que roda em issues |

### Proteções

- **Quem pode acionar:** o workflow confere `github.event.sender` contra `AGENT_ALLOWED_SENDERS` e ignora o resto. Bots só entram se listados (repassados à action em `allowed_bots`).
- **Escopo do agente:** ferramentas limitadas a ler e editar o código, rodar `npm`, `npx expo install` e `npx tsc`, consultar o git, ler a issue, commitar pela API e abrir PR. As regras `ask`/`deny` de `.claude/settings.json` valem na nuvem, onde `ask` equivale a negado: o agente não mexe em CI, hooks, skill, `.mcp.json`, `ios/`, `android/` nem `.env`, e não faz `git push`.
- **Nunca faz merge** e nunca força push. O PR sai como rascunho.
- **Limites de custo:** `--max-turns` e `timeout-minutes` no job; uma execução por issue (concorrência por número da issue). Rodar de novo exige remover e recolocar a label.
- **Falha visível:** se o agente não concluir, ou disser que abriu o PR e ele não existir, o workflow comenta o motivo na issue e remove a label `agente`, para o card não ficar parado em silêncio.

## Passo 3 · Claude Code local com o MCP do Linear

### Configuração

O `.mcp.json` na raiz do repositório, sem nenhum segredo:

```json
{
  "mcpServers": {
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app/mcp"
    }
  }
}
```

Na primeira sessão, rode `/mcp` no Claude Code e faça o login no Linear (OAuth). Cada pessoa autentica com a própria conta; nada fica no repositório. Equivalente pela linha de comando: `claude mcp add --transport http linear https://mcp.linear.app/mcp`.

O MCP do Linear permite buscar, criar e atualizar issues, projetos e comentários. Para só consultar o board existe o endereço somente leitura `https://mcp.linear.app/mcp/readonly`.

### Como usar

| Você pede | O agente faz |
|---|---|
| "Quais cards estão em Todo no LUH?" | Lista as issues do time por status e prioridade |
| "Pega o LUH-12" | Lê a issue, move para **In Progress**, cria a branch `luh-12-…` a partir da `main` e implementa seguindo `AGENTS.md` |
| "Abre o PR" | Abre o PR com o template e `Fixes LUH-12`; a automação do Linear assume o status daí em diante |
| "Cria um card para isso" | Cria a issue no LUH com objetivo e critérios de aceite, sem a label `agente` |

### Regras para o agente local

- **Só mexe no board quando pedido:** mover status, comentar ou criar card exige um pedido explícito. Em `.claude/settings.json`, as ferramentas de leitura do MCP do Linear (`list_*`, `get_*`) estão liberadas, exceto `list_comments` e `get_document`, que trazem texto de outras pessoas e pedem aprovação; as de escrita (`create_issue`, `update_issue`, `create_comment`, `create_project`, `update_project`) pedem aprovação. Ferramenta nova do Linear que não estiver na lista também pede aprovação.
- **Não muda status que a automação controla:** depois que o PR existe, In Review e Done ficam com a integração do GitHub.
- **Resumo no card:** ao abrir o PR, comenta na issue o que mudou e como testar (o mesmo texto do PR).

## Segurança

| Risco | Mitigação |
|---|---|
| Texto da issue tenta instruir o agente ("ignore as regras e…") | O conteúdo da issue é **dado, não instrução**. O agente segue `AGENTS.md` e os docs. O PR passa pelo review e por uma pessoa |
| Agente afrouxa gates para o PR passar | Arquivos de gate exigem aprovação (`ask`) e o review trata enfraquecimento de gate como alto |
| Token do Linear vazado | Não há token no repositório: o local usa OAuth por pessoa. Se o passo 2 precisar consultar o Linear, usa o secret `LINEAR_API_KEY` com escopo mínimo |
| Label acionada por terceiro | Repositório público: só colaboradores aplicam label; o workflow confere o autor |
| Custo descontrolado | `--max-turns`, timeout, uma execução por issue |

## O que validar na implementação

Pontos que a documentação do Linear não deixa explícitos e serão confirmados no primeiro uso:

1. **O login do bot do Linear** que aplica a label na sincronização: ver em Actions → "Agente (issues)" → passo "Quem acionou" e incluí-lo em `AGENT_ALLOWED_SENDERS`. Se a sincronização usar a conta GitHub da pessoa conectada, basta o login dela.
2. **A label aplicada pela sincronização dispara `issues: labeled`.** Eventos causados por apps (como o do Linear) disparam workflows; só os do `GITHUB_TOKEN` não. Se não disparar, o plano B é o agente reagir à abertura da issue sincronizada, ou a um comentário `@claude`.
3. **Onde o ID `LUH-<n>` aparece na issue espelho** (título, corpo ou comentário de linkback do Linear; o `agent-branch.sh` procura nos três), para montar a branch e o `Fixes LUH-<n>`. Se não aparecer, o agente usa só `Closes #<N>`: a sincronização de status fecha o card do mesmo jeito.
4. **Mudança de status ao abrir o PR como rascunho** (gatilho "PR drafted" configurado no time).
5. **Somente issues novas sincronizam.** Issues anteriores à sincronização precisam ser importadas ou recriadas.

## Alternativas consideradas

| Opção | Por que não agora |
|---|---|
| Delegar a issue a um agente nativo do Linear (Cursor, Codex, Copilot, Devin) | Não há agente "Claude" nativo; usaria outro modelo e outras regras fora da skill e dos gates do projeto |
| Agentes de terceiros com Claude Code (Cyrus, Boxes.dev, Merlin) | Precisam de servidor ou máquina ligada e de mais uma conta; o passo 2 usa só o GitHub Actions |
| GitHub Projects no lugar do Linear | Escolha do projeto foi o Linear; a integração acima mantém o GitHub como fonte do código e dos gates |
