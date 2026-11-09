#!/usr/bin/env bash
# Cria (ou atualiza) o ruleset "Gates de qualidade" no GitHub:
#   - merge só por PR, com os checks obrigatórios "checks" (CI) e "review" (code review) verdes;
#   - sem force-push e sem apagar a branch.
#
# Vale para as branches que RECEBEM merge. Por padrão: a branch padrão (main), develop,
# release/** e hotfix/**. Passe padrões extras como argumentos:  ./scripts/setup-branch-ruleset.sh "feature/**"
#
# Por que não "todas as branches": o GitHub só aceita um commit numa branch protegida se ele
# já tiver os checks verdes, e os checks só rodam depois do push. Proteger a branch onde se
# trabalha impede qualquer push nela. O revisor roda mesmo assim em toda branch e em todo PR
# (.github/workflows/code-review.yml); o ruleset decide onde o resultado BLOQUEIA o merge.
#
# Sem bypass por padrão: nem admin faz merge com o check reprovado. Para permitir que admins
# façam o merge de um PR reprovado (só via PR, fica registrado): COM_BYPASS=1 ./scripts/setup-branch-ruleset.sh
#
# Os checks exigidos são amarrados ao app do GitHub Actions (integration_id 15368): outro app
# ou token não consegue publicar um status "review"/"checks" verde no lugar do workflow.
#
# Requer: gh autenticado com permissão de admin no repositório (gh auth login).
set -euo pipefail

NAME="Gates de qualidade"
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

include='"~DEFAULT_BRANCH","refs/heads/develop","refs/heads/release/**","refs/heads/hotfix/**"'
for pattern in "$@"; do include+=",\"refs/heads/${pattern#refs/heads/}\""; done

GITHUB_ACTIONS_APP_ID=15368
if [ "${COM_BYPASS:-0}" = "1" ]; then
  bypass='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"pull_request"}]'
else
  bypass='[]'
fi

body=$(cat <<JSON
{
  "name": "$NAME",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": $bypass,
  "conditions": { "ref_name": { "include": [$include], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "checks", "integration_id": $GITHUB_ACTIONS_APP_ID },
          { "context": "review", "integration_id": $GITHUB_ACTIONS_APP_ID } ] } }
  ]
}
JSON
)

id=$(gh api --paginate "repos/$repo/rulesets" --jq ".[] | select(.name == \"$NAME\") | .id" | head -1)
if [ -n "$id" ]; then
  printf '%s' "$body" | gh api -X PUT "repos/$repo/rulesets/$id" --input - >/dev/null
  echo "Ruleset \"$NAME\" atualizado (#$id) em $repo."
else
  id=$(printf '%s' "$body" | gh api -X POST "repos/$repo/rulesets" --input - --jq .id)
  echo "Ruleset \"$NAME\" criado (#$id) em $repo."
fi
echo "Branches protegidas: $(echo "$include" | tr -d '"' | sed 's#refs/heads/##g; s#,#, #g')"
echo "Checks obrigatórios: checks (CI), review (code review), publicados pelo GitHub Actions"
echo "Bypass de admin: $([ "${COM_BYPASS:-0}" = "1" ] && echo 'ligado (só via PR)' || echo 'desligado')"
echo "Ver: https://github.com/$repo/rules/$id"
