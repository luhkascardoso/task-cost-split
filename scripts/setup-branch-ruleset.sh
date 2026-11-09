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
# Escape: admins do repositório podem fazer o merge de um PR reprovado conscientemente
# (bypass só via PR, fica registrado). Para tirar até isso: SEM_BYPASS=1 ./scripts/setup-branch-ruleset.sh
#
# Requer: gh autenticado com permissão de admin no repositório (gh auth login).
set -euo pipefail

NAME="Gates de qualidade"
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

include='"~DEFAULT_BRANCH","refs/heads/develop","refs/heads/release/**","refs/heads/hotfix/**"'
for pattern in "$@"; do include+=",\"refs/heads/${pattern#refs/heads/}\""; done

if [ "${SEM_BYPASS:-0}" = "1" ]; then
  bypass='[]'
else
  bypass='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"pull_request"}]'
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
        "required_status_checks": [ { "context": "checks" }, { "context": "review" } ] } }
  ]
}
JSON
)

id=$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name == \"$NAME\") | .id" | head -1)
if [ -n "$id" ]; then
  printf '%s' "$body" | gh api -X PUT "repos/$repo/rulesets/$id" --input - >/dev/null
  echo "Ruleset \"$NAME\" atualizado (#$id) em $repo."
else
  id=$(printf '%s' "$body" | gh api -X POST "repos/$repo/rulesets" --input - --jq .id)
  echo "Ruleset \"$NAME\" criado (#$id) em $repo."
fi
echo "Branches protegidas: $(echo "$include" | tr -d '"' | sed 's#refs/heads/##g; s#,#, #g')"
echo "Checks obrigatórios: checks (CI), review (code review)"
echo "Ver: https://github.com/$repo/rules/$id"
