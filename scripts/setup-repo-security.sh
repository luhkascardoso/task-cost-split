#!/usr/bin/env bash
# Liga os recursos de segurança do GitHub neste repositório (gratuitos em repositório público):
#   - alertas do Dependabot (dependência com vulnerabilidade conhecida);
#   - correções de segurança automáticas (o Dependabot abre o PR com a versão corrigida);
#   - secret scanning e push protection (bloqueia o push que contém token/chave).
# O CodeQL roda pelo workflow .github/workflows/codeql.yml (não ligue o "default setup"
# de code scanning nas configurações: ele conflita com o workflow).
#
# Requer: gh autenticado com permissão de admin no repositório (gh auth login).
set -euo pipefail

repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Repositório: $repo"

gh api -X PUT "repos/$repo/vulnerability-alerts" >/dev/null
echo "✔ Alertas do Dependabot"

gh api -X PUT "repos/$repo/automated-security-fixes" >/dev/null
echo "✔ Correções de segurança automáticas do Dependabot"

gh api -X PATCH "repos/$repo" --input - >/dev/null <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
echo "✔ Secret scanning e push protection"

echo
echo "Falta uma coisa manual: em Settings → Secrets and variables → Dependabot, crie o"
echo "CLAUDE_CODE_OAUTH_TOKEN (ou ANTHROPIC_API_KEY), para o code review rodar nos PRs do Dependabot."
