#!/usr/bin/env bash
# Confere o resultado do agente sem confiar só no que o modelo declarou:
# o PR rascunho tem que existir de verdade na branch do agente.
# Entradas (env): OUT (structured_output), BRANCH, ISSUE_NUMBER, CONCLUSION (success/failure),
#   RUN_URL, GH_TOKEN, GITHUB_REPOSITORY.
# Sucesso: comenta o link do PR na issue. Falha: comenta o motivo e remove a label "agente".
set -euo pipefail

status=$(printf '%s' "${OUT:-}" | jq -r '.status // empty' 2>/dev/null || true)
resumo=$(printf '%s' "${OUT:-}" | jq -r '.resumo // empty' 2>/dev/null || true)
motivo=$(printf '%s' "${OUT:-}" | jq -r '.motivo // empty' 2>/dev/null || true)

pr_url=$(gh pr list --repo "$GITHUB_REPOSITORY" --head "$BRANCH" --state open --json url --jq '.[0].url // empty')

if [ -n "$pr_url" ] && [ "$status" = "pr_aberto" ]; then
  body=$(printf '🤖 PR rascunho aberto pelo agente: %s\n\n%s\n\nRevise, marque como pronto para revisão e faça o merge quando o CI e o review passarem. [Execução](%s)' \
    "$pr_url" "${resumo:-}" "$RUN_URL")
  gh issue comment "$ISSUE_NUMBER" --repo "$GITHUB_REPOSITORY" --body "$body"
  echo "PR: $pr_url"
  exit 0
fi

if [ -n "$pr_url" ]; then
  reason="O PR existe ($pr_url), mas o agente não concluiu: ${motivo:-sem motivo informado}."
elif [ "$status" = "pr_aberto" ]; then
  reason="O agente informou que abriu o PR, mas nenhum PR aberto foi encontrado na branch \`$BRANCH\`."
elif [ "$status" = "bloqueado" ]; then
  reason="${motivo:-O agente não conseguiu concluir e não informou o motivo.}"
elif [ "${CONCLUSION:-}" != "success" ]; then
  reason="A execução do agente falhou (credencial, limite de uso ou erro). Veja os logs."
else
  reason="O agente terminou sem um resultado válido."
fi

body=$(printf '🤖 O agente não concluiu a issue.\n\n**Motivo:** %s\n\nA label `agente` foi removida. Ajuste a issue (objetivo, critérios de aceite, regras) e aplique a label de novo. [Execução](%s)' \
  "$reason" "$RUN_URL")
gh issue comment "$ISSUE_NUMBER" --repo "$GITHUB_REPOSITORY" --body "$body"
gh issue edit "$ISSUE_NUMBER" --repo "$GITHUB_REPOSITORY" --remove-label agente || true
echo "::error::Agente não concluiu: $reason"
exit 1
