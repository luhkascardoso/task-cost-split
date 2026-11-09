#!/usr/bin/env bash
# Testes dos scripts do agente (agent-guard, agent-branch, agent-outcome).
# Roda sem rede: o `gh` é substituído por um stub. Uso: bash .github/scripts/tests/agent-scripts.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0

trim() { local v="$1"; v="${v#"${v%%[![:space:]]*}"}"; printf '%s' "${v%"${v##*[![:space:]]}"}"; }
check() { # nome, esperado, obtido (espaços nas pontas não contam)
  if [ "$(trim "$2")" = "$(trim "$3")" ]; then pass=$((pass + 1)); echo "✔ $1"
  else fail=$((fail + 1)); echo "✘ $1"; echo "    esperado: $2"; echo "    obtido:   $3"; fi
}

# ---------- agent-guard.sh
g() { printf '%s' "$(SENDER="$1" ALLOWED="$2" GITHUB_OUTPUT="$TMP/g" bash "$DIR/agent-guard.sh" >/dev/null 2>&1; echo "rc=$?"; cat "$TMP/g" 2>/dev/null; rm -f "$TMP/g")" | tr '\n' ' '; }
check "guard: dono autorizado"                 "rc=0 allowed=true bots= "            "$(g luhkascardoso luhkascardoso)"
check "guard: maiúsculas não importam"         "rc=0 allowed=true bots= "            "$(g LuhkasCardoso luhkascardoso)"
check "guard: bot listado autorizado"          "rc=0 allowed=true bots=linear[bot] " "$(g 'linear[bot]' 'luhkascardoso, linear[bot]')"
check "guard: terceiro não autorizado"         "rc=0 allowed=false bots=linear[bot] " "$(g mallory 'luhkascardoso,linear[bot]')"
check "guard: lista vazia não autoriza"        "rc=0 allowed=false bots= "           "$(g mallory '')"
check "guard: '*' é recusado"                  "rc=1 "                              "$(g mallory '*')"

# ---------- agent-branch.sh
b() { printf '%s' "$(TITLE="$1" BODY="$2" COMMENTS="$3" ISSUE_NUMBER=7 TEAM_KEY=LUH GITHUB_OUTPUT="$TMP/b" bash "$DIR/agent-branch.sh" >/dev/null 2>&1; echo "rc=$?"; cat "$TMP/b" 2>/dev/null; rm -f "$TMP/b")" | tr '\n' ' '; }
check "branch: ID no título e acentos"         "rc=0 linear_id=LUH-12 branch=agente/luh-12-divisao-por-peso-nas-despesas " \
  "$(b 'LUH-12 Divisão por peso nas despesas compartilhadas' '' '')"
check "branch: ID só no linkback"              "rc=0 linear_id=LUH-34 branch=agente/luh-34-divisao-por-peso " \
  "$(b 'Divisão por peso' 'corpo' 'https://linear.app/luhkas27/issue/LUH-34/divisao')"
check "branch: sem ID usa o número da issue"   "rc=0 linear_id= branch=agente/issue-7-exportar-resumo-em-csv " \
  "$(b '[Feature] Exportar resumo em CSV' '' '')"
check "branch: título só com símbolos"         "rc=0 linear_id= branch=agente/issue-7-issue " "$(b '!!! ???' '' '')"
check "branch: título malicioso vira texto"    "rc=0 linear_id= branch=agente/issue-7-x-rm-rf-whoami-id " \
  "$(b 'x; rm -rf / $(whoami) `id` ../../main' '' '')"
check "branch: ID de outro time é ignorado"    "rc=0 linear_id= branch=agente/issue-7-abc-1-tarefa " "$(b 'ABC-1 tarefa' '' '')"

# ---------- agent-outcome.sh (gh simulado)
mkdir -p "$TMP/bin"
cat > "$TMP/bin/gh" <<'STUB'
#!/bin/sh
case "$1 $2" in
  "pr list") printf '%s' "${FAKE_PR:-}";;
  "issue comment") case "$*" in *"PR rascunho aberto"*) echo comentou-pr >> "$LOG";; *) echo comentou-falha >> "$LOG";; esac;;
  "issue edit") echo removeu-label >> "$LOG";;
esac
STUB
chmod +x "$TMP/bin/gh"
o() { : > "$TMP/log"; PATH="$TMP/bin:$PATH" LOG="$TMP/log" OUT="$1" FAKE_PR="$2" CONCLUSION="$3" BRANCH=agente/luh-12-x \
  ISSUE_NUMBER=7 RUN_URL=u GITHUB_REPOSITORY=o/r bash "$DIR/agent-outcome.sh" >/dev/null 2>&1; echo "rc=$? $(tr '\n' ' ' < "$TMP/log")"; }
ok='{"status":"pr_aberto","pr_url":"u","resumo":"r","motivo":""}'
check "outcome: PR aberto e existente"         "rc=0 comentou-pr "               "$(o "$ok" https://github.com/o/r/pull/9 success)"
check "outcome: diz que abriu mas não existe"  "rc=1 comentou-falha removeu-label " "$(o "$ok" '' success)"
check "outcome: bloqueado"                     "rc=1 comentou-falha removeu-label " \
  "$(o '{"status":"bloqueado","pr_url":"","resumo":"","motivo":"faltam critérios"}' '' success)"
check "outcome: execução falhou sem saída"     "rc=1 comentou-falha removeu-label " "$(o '' '' failure)"
check "outcome: PR existe mas bloqueado"       "rc=1 comentou-falha removeu-label " \
  "$(o '{"status":"bloqueado","pr_url":"","resumo":"","motivo":"testes falham"}' https://github.com/o/r/pull/9 success)"

echo; echo "$pass passaram, $fail falharam"
[ "$fail" -eq 0 ]
