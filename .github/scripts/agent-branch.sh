#!/usr/bin/env bash
# Calcula a branch do agente a partir da issue. Ela é fixada antes de o Claude rodar
# (CLAUDE_BRANCH): o agente não escolhe a branch e nunca commita na branch padrão.
# Entradas (env): TITLE, BODY, COMMENTS (texto da issue espelho), ISSUE_NUMBER, TEAM_KEY (ex.: LUH).
# Saídas em $GITHUB_OUTPUT: linear_id (vazio se não achar), branch.
set -euo pipefail

out() { echo "$1=$2" >> "${GITHUB_OUTPUT:-/dev/stdout}"; }
team=$(printf '%s' "${TEAM_KEY:-LUH}" | tr '[:lower:]' '[:upper:]')

# ID do Linear: no título, no corpo ou no comentário de linkback da sincronização.
linear_id=$(printf '%s\n%s\n%s' "${TITLE:-}" "${BODY:-}" "${COMMENTS:-}" \
  | grep -oE "\\b${team}-[0-9]+\\b" | head -1 || true)

# Resumo do título: sem acento, minúsculo, só [a-z0-9], até 5 palavras e 40 caracteres.
slug=$(printf '%s' "${TITLE:-}" \
  | sed -E "s/\\b${team}-[0-9]+\\b//g; s/^\\[[^]]*\\] *//" \
  | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null \
  | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' \
  | cut -d- -f1-5 | cut -c1-40 | sed -E 's/-+$//')
[ -z "$slug" ] && slug="issue"

if [ -n "$linear_id" ]; then
  ref=$(printf '%s' "$linear_id" | tr '[:upper:]' '[:lower:]')
else
  ref="issue-${ISSUE_NUMBER}"
fi
branch="agente/${ref}-${slug}"

git check-ref-format --branch "$branch" >/dev/null
out linear_id "$linear_id"
out branch "$branch"
echo "Linear: ${linear_id:-(não encontrado)} | branch: $branch"
