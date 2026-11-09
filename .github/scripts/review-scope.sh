#!/usr/bin/env bash
# Decide se o code review roda e sobre qual diff. Escreve run/mode/base/reason em $GITHUB_OUTPUT.
# Entradas (env): EVENT, PR_NUMBER, IS_FORK, BASE_SHA, HEAD_SHA, BRANCH, DEFAULT_BRANCH
set -euo pipefail

out() { echo "$1=$2" >> "${GITHUB_OUTPUT:-/dev/stdout}"; }
skip() { out run false; out reason "$1"; echo "Sem review: $1"; exit 0; }

# Código do app e os próprios gates (CI, hooks, skill). Só docs e assets ficam de fora.
RELEVANT='^(src/|plugins/|\.maestro/|\.github/|\.claude/|\.githooks/|app\.json$|package\.json$|package-lock\.json$|tsconfig\.json$|eslint\.config\.js$)'

if [ "$EVENT" = "pull_request" ]; then
  if [ "${IS_FORK:-false}" = "true" ]; then
    echo "::error::PR de fork não recebe os secrets, então não pode ser revisado automaticamente. Revise manualmente e faça o merge como admin." >&2
    exit 1
  fi
  out mode pr
  files=$(gh pr diff "$PR_NUMBER" --name-only)
else
  open=$(gh pr list --head "$BRANCH" --state open --json number --jq 'map(.number) | join(",")')
  [ -n "$open" ] && skip "a branch tem PR aberto (#$open); o review roda nele"
  out mode push
  zero=0000000000000000000000000000000000000000
  if [ -z "${BASE_SHA:-}" ] || [ "$BASE_SHA" = "$zero" ] || ! git cat-file -e "$BASE_SHA^{commit}" 2>/dev/null; then
    BASE_SHA=$(git merge-base "origin/$DEFAULT_BRANCH" "$HEAD_SHA")
  fi
  out base "$BASE_SHA"
  files=$(git diff --name-only "$BASE_SHA" "$HEAD_SHA")
fi

relevant=$(printf '%s\n' "$files" | grep -E "$RELEVANT" || true)
[ -z "$relevant" ] && skip "nenhuma mudança de código ou de gates (só docs/assets)"

echo "Arquivos para revisar:"; printf '  %s\n' $relevant
out run true
out reason "$(printf '%s\n' "$relevant" | wc -l | tr -d ' ') arquivo(s) de código alterado(s)"
