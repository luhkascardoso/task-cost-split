#!/usr/bin/env bash
# Decide se o code review roda e prepara o diff para o revisor em $CTX_DIR.
# Saídas em $GITHUB_OUTPUT: run, mode (pr|push), base, head, files, reason.
# Entradas (env): EVENT, PR_NUMBER, IS_FORK, IS_DRAFT, PR_BASE_SHA, PR_HEAD_SHA, BEFORE_SHA, SHA,
#                 BRANCH, DEFAULT_BRANCH, CTX_DIR
set -euo pipefail

out() { echo "$1=$2" >> "${GITHUB_OUTPUT:-/dev/stdout}"; }
skip() { out run false; out reason "$1"; echo "Sem review: $1"; exit 0; }

# Fica de fora só o que não muda comportamento nem gate: docs/, assets/, README e licença.
# Qualquer outro arquivo é revisado, inclusive markdown que instrui agentes
# (AGENTS.md, CLAUDE.md, .claude/**/SKILL.md) e código, configs, lockfiles, scripts e CI.
IGNORED='^(docs/|assets/)|^README\.md$|^LICENSE$'

CTX_DIR=${CTX_DIR:-.review-ctx}
mkdir -p "$CTX_DIR"

if [ "$EVENT" = "pull_request" ]; then
  # Rascunho: não revisa e não reprova. Rascunho não pode ser mergeado; ao marcar
  # "Ready for review" o evento ready_for_review roda o review e o check volta a pendente.
  [ "${IS_DRAFT:-false}" = "true" ] && skip "PR em rascunho; o review roda ao marcar Ready for review"
  if [ "${IS_FORK:-false}" = "true" ]; then
    echo "::error::PR de fork não recebe os secrets, então não pode ser revisado automaticamente. Revise manualmente e faça o merge como admin." >&2
    exit 1
  fi
  mode=pr
  # Diff pelo git (e não pela API): sem o limite de 300 arquivos do `gh pr diff`.
  base=$(git merge-base "$PR_BASE_SHA" "$PR_HEAD_SHA")
  head=$PR_HEAD_SHA
else
  open=$(gh pr list --head "$BRANCH" --state open --json number --jq 'map(.number) | join(",")')
  [ -n "$open" ] && skip "a branch tem PR aberto (#$open); o review roda nele"
  mode=push
  head=$SHA
  zero=0000000000000000000000000000000000000000
  base=${BEFORE_SHA:-}
  if [ -z "$base" ] || [ "$base" = "$zero" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then
    base=$(git merge-base "origin/$DEFAULT_BRANCH" "$head")
  fi
fi

out mode "$mode"
out base "$base"
out head "$head"

git diff --name-only "$base" "$head" > "$CTX_DIR/files.txt"
relevant=$(grep -Ev "$IGNORED" "$CTX_DIR/files.txt" || true)
[ -z "$relevant" ] && skip "nenhuma mudança de código ou de configuração (só docs/, assets/, README ou LICENSE)"

git diff --find-renames "$base" "$head" > "$CTX_DIR/diff.patch"
# Com status (A adicionado, M modificado, D removido, R renomeado), para o revisor não
# confundir "ausente no workspace" com "removido pelo PR".
git diff --find-renames --name-status "$base" "$head" > "$CTX_DIR/changes.txt"
count=$(wc -l < "$CTX_DIR/files.txt" | tr -d ' ')
echo "Arquivos para revisar ($count):"; sed 's/^/  /' "$CTX_DIR/files.txt"
out files "$count"
out run true
out reason "$count arquivo(s) alterado(s)"
