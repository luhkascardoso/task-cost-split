#!/usr/bin/env bash
# Decide se quem aplicou a label pode acionar o agente.
# Entradas (env): SENDER (login de quem aplicou a label), ALLOWED (lista separada por vírgula,
#   da variável do repositório AGENT_ALLOWED_SENDERS). Bots entram com o sufixo [bot].
# Saídas em $GITHUB_OUTPUT: allowed (true/false), bots (lista só com os bots, para allowed_bots).
set -euo pipefail

out() { echo "$1=$2" >> "${GITHUB_OUTPUT:-/dev/stdout}"; }

allowed=false
bots=""
IFS=',' read -ra entries <<< "${ALLOWED:-}"
for raw in "${entries[@]}"; do
  entry=$(printf '%s' "$raw" | tr -d '[:space:]')
  [ -z "$entry" ] && continue
  [ "$entry" = "*" ] && { echo "::error::AGENT_ALLOWED_SENDERS não aceita '*'. Liste os logins." >&2; exit 1; }
  [ "${entry,,}" = "${SENDER,,}" ] && allowed=true
  case "$entry" in *"[bot]") bots="${bots:+$bots,}$entry" ;; esac
done

out allowed "$allowed"
out bots "$bots"
if [ "$allowed" = true ]; then
  echo "Acionado por $SENDER (autorizado)."
else
  echo "::notice::Label 'agente' aplicada por $SENDER, que não está em AGENT_ALLOWED_SENDERS. Agente não acionado."
fi
