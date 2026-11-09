#!/usr/bin/env bash
# Stop: antes de o agente encerrar, roda os testes ligados aos arquivos alterados
# (jest --onlyChanged usa o git). Se falharem, o agente continua e corrige.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

input=$(cat)
# Evita loop: se já estamos continuando por causa deste hook, deixa encerrar.
active=$(printf '%s' "$input" | node -e '
  let s = ""; process.stdin.on("data", c => s += c).on("end", () => {
    try { process.stdout.write(String(JSON.parse(s).stop_hook_active === true)); } catch { process.stdout.write("false"); }
  });')
[ "$active" = "true" ] && exit 0

# Nada de código alterado → nada a testar.
git status --porcelain -- src jest.setup.ts package.json 2>/dev/null | grep -q . || exit 0

if ! out=$(npx --no-install jest --onlyChanged --passWithNoTests --silent 2>&1); then
  {
    printf "Testes falhando nos arquivos alterados:\n"
    printf '%s\n' "$out" | tail -60
    printf "\nCorrija antes de concluir. Se mudou uma regra de domínio, atualize o teste junto (docs/05-regras-de-negocio.md).\n"
  } >&2
  exit 2
fi
exit 0
