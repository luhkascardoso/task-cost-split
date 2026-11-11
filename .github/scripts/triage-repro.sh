#!/usr/bin/env bash
# Roda o teste de reprodução que o agente escreveu e classifica o resultado. É este passo,
# e não o agente, que afirma se o bug foi reproduzido.
# O teste descreve o comportamento CORRETO: se falhar, o bug existe.
# Entradas (env): ISSUE_NUMBER, CTX_DIR. Saída: $CTX_DIR/repro.json
#   { status: nao_tentado | reproduzido | nao_reproduzido | erro, file, output, code }
set -uo pipefail

file="src/__repro__/issue-${ISSUE_NUMBER}.test.ts"
[ -f "$file" ] || file="${file}x"
result="$CTX_DIR/repro.json"
mkdir -p "$CTX_DIR"

if [ ! -f "$file" ]; then
  jq -n '{status: "nao_tentado", file: "", output: "", code: ""}' > "$result"
  echo "Sem teste de reprodução."
  exit 0
fi

# Outros arquivos em src/__repro__ são ignorados: só o teste desta issue roda.
report="$CTX_DIR/jest.json"
rm -f "$report"
timeout 300 npx jest --ci --json --outputFile="$report" --runTestsByPath "$file" > "$CTX_DIR/jest.log" 2>&1
rc=$?
strip() { sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g' | head -c 3000; }

if [ ! -s "$report" ]; then
  status=erro; output=$( (echo "jest saiu com código $rc sem relatório."; tail -n 40 "$CTX_DIR/jest.log") | strip)
elif [ "$(jq '.numRuntimeErrorTestSuites > 0 or .numTotalTests == 0' "$report")" = true ]; then
  status=erro; output=$(jq -r '[.testResults[].message] | join("\n")' "$report" | strip)
elif [ "$(jq '.numFailedTests > 0' "$report")" = true ]; then
  status=reproduzido
  output=$(jq -r '[.testResults[].assertionResults[] | select(.status == "failed") | "✘ \(.fullName)\n\(.failureMessages | join("\n"))"] | join("\n\n")' "$report" | strip)
else
  status=nao_reproduzido
  output=$(jq -r '[.testResults[].assertionResults[] | "✔ \(.fullName)"] | join("\n")' "$report" | strip)
fi

jq -n --arg status "$status" --arg file "$file" --arg output "$output" --rawfile code "$file" \
  '{status: $status, file: $file, output: $output, code: ($code | .[0:6000])}' > "$result"
echo "Reprodução: $status ($file)"
