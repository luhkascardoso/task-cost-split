#!/usr/bin/env bash
# Junta o contexto da triagem em arquivos, para o agente ler com Read (texto da issue nunca
# entra no prompt do workflow).
# Entradas (env): ISSUE_NUMBER, CTX_DIR, GH_TOKEN (só leitura).
# Saídas em $CTX_DIR: issue.json (a issue), issues.json (as outras, para achar duplicadas),
#   labels.json (labels do repositório). Em $GITHUB_OUTPUT: open (true/false), author.
set -euo pipefail

out() { echo "$1=$2" >> "${GITHUB_OUTPUT:-/dev/stdout}"; }
mkdir -p "$CTX_DIR"

gh issue view "$ISSUE_NUMBER" --json number,title,body,author,labels,state,createdAt \
  > "$CTX_DIR/issue.json"

# Abertas e fechadas: uma duplicada pode ser de algo já resolvido.
gh issue list --state all --limit 300 --json number,title,state,labels \
  --jq "[.[] | select(.number != ($ISSUE_NUMBER | tonumber)) | {number, title, state, labels: [.labels[].name]}]" \
  > "$CTX_DIR/issues.json"

gh label list --limit 100 --json name,description > "$CTX_DIR/labels.json"

out open "$(jq -r '.state == "OPEN"' "$CTX_DIR/issue.json")"
out author "$(jq -r '.author.login' "$CTX_DIR/issue.json")"
echo "Issue #$ISSUE_NUMBER: $(jq '. | length' "$CTX_DIR/issues.json") outras issues e $(jq '. | length' "$CTX_DIR/labels.json") labels no contexto."
