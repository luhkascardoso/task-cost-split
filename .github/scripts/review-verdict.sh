#!/usr/bin/env bash
# Transforma o veredito estruturado do review em resultado do check.
# Entrada (env): OUT = structured_output da claude-code-action (JSON).
# Falha se o veredito for request_changes ou houver achado bloqueante, ou se não houver veredito.
set -euo pipefail

summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

if [ "${SKIPPED:-}" = "true" ]; then
  echo "::error::A claude-code-action pulou o review: o workflow deste PR difere do da branch padrão e a validação do app do Claude recusou o token. Confira se o passo usa github_token." >&2
  exit 1
fi

if [ -z "${OUT:-}" ] || ! printf '%s' "$OUT" | jq -e 'type == "object" and has("verdict")' >/dev/null 2>&1; then
  echo "::error::O review não devolveu um veredito. Veja o log do passo 'Review com Claude' (secret ausente ou erro na execução)." >&2
  exit 1
fi

verdict=$(printf '%s' "$OUT" | jq -r '.verdict')
blocking=$(printf '%s' "$OUT" | jq -r '.blocking // 0')
important=$(printf '%s' "$OUT" | jq -r '.important // 0')
suggestions=$(printf '%s' "$OUT" | jq -r '.suggestions // 0')

case "$verdict" in
  approve)              label="✅ Pode seguir" ;;
  approve_with_changes) label="⚠️ Pode seguir após ajustes" ;;
  request_changes)      label="⛔ Precisa de mudanças" ;;
  *) echo "::error::Veredito desconhecido: $verdict" >&2; exit 1 ;;
esac

{
  echo "## Code review · $label"
  echo
  echo "| 🔴 Bloqueante | 🟡 Importante | 🔵 Sugestão |"
  echo "|---|---|---|"
  echo "| $blocking | $important | $suggestions |"
  echo
  printf '%s' "$OUT" | jq -r '.summary_markdown // ""'
} >> "$summary"

if [ "$verdict" = "request_changes" ] || [ "$blocking" -gt 0 ]; then
  echo "::error::Code review: $label ($blocking bloqueante(s)). Corrija e faça push de novo." >&2
  exit 1
fi
echo "Code review: $label"
