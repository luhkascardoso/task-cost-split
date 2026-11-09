#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): lint do arquivo editado + typecheck do projeto.
# Exit 2 devolve o erro ao agente, que corrige na mesma hora.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

file=$(node -e '
  let s = ""; process.stdin.on("data", c => s += c).on("end", () => {
    try { process.stdout.write(JSON.parse(s).tool_input?.file_path ?? ""); } catch {}
  });')

# Só código TS/JS do app; docs, YAML e JSON não passam por aqui.
case "$file" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
case "$file" in */node_modules/*|*/.expo/*|*/ios/*|*/android/*) exit 0 ;; esac

errors=""

if ! out=$(npx --no-install eslint --no-warn-ignored "$file" 2>&1); then
  errors+="ESLint em ${file#"$PWD"/}:\n$out\n\n"
fi

if ! out=$(npx --no-install tsc --noEmit --pretty false 2>&1); then
  errors+="Typecheck (tsc --noEmit):\n$(printf '%s' "$out" | head -40)\n"
fi

if [ -n "$errors" ]; then
  printf "%b" "$errors" >&2
  printf "Corrija os erros acima antes de seguir (regra do AGENTS.md: typecheck e lint limpos).\n" >&2
  exit 2
fi
exit 0
