#!/usr/bin/env bash
# Decide o check obrigatório "review" a partir do resultado estruturado do revisor.
# Entrada (env): OUT = structured_output da claude-code-action (JSON); SKIPPED.
# Reprova se: não houver resultado, o veredito for request_changes, ou existir achado
# crítico/alto confirmado (recalculado aqui, sem confiar só no que o modelo declarou).
# No PR, este script vem da branch base: o próprio PR não consegue trocá-lo.
set -euo pipefail

if [ "${SKIPPED:-}" = "true" ]; then
  echo "::error::A claude-code-action pulou o review (validação do workflow). Confira se o passo usa github_token." >&2
  exit 1
fi

if [ -z "${OUT:-}" ] || ! printf '%s' "$OUT" | jq -e 'type == "object" and has("verdict")' >/dev/null 2>&1; then
  echo "::error::O review não devolveu um resultado. Veja o passo 'Motivo da falha do review'." >&2
  exit 1
fi

verdict=$(printf '%s' "$OUT" | jq -r '.verdict')
case "$verdict" in approve|approve_with_changes|request_changes) ;; *)
  echo "::error::Veredito desconhecido: $verdict" >&2; exit 1 ;;
esac

declared=$(printf '%s' "$OUT" | jq -r '.blocking // 0')
counted=$(printf '%s' "$OUT" | jq -r '[.findings[]? | select((.possible_false_positive | not) and (.severity == "critico" or .severity == "alto"))] | length')
read -r crit high med low <<<"$(printf '%s' "$OUT" | jq -r '[.findings[]? | select(.possible_false_positive | not)] as $f
  | [($f|map(select(.severity=="critico"))|length), ($f|map(select(.severity=="alto"))|length),
     ($f|map(select(.severity=="medio"))|length), ($f|map(select(.severity=="baixo"))|length)] | @tsv')"

echo "Veredito: $verdict | crítico $crit · alto $high · médio $med · baixo $low"

if [ "$verdict" = "request_changes" ] || [ "$counted" -gt 0 ] || [ "$declared" -gt 0 ]; then
  echo "::error::Code review REPROVADO: $crit crítico(s) e $high alto(s). Veja o comentário no PR, corrija e faça push de novo." >&2
  exit 1
fi
echo "Code review APROVADO."
