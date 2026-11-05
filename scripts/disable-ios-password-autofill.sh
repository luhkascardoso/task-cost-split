#!/usr/bin/env bash
# Desliga "AutoFill Passwords" no simulador iOS booted (ou UDID em $1).
# Necessário para Maestro digitar em campos secureTextEntry.
# Ver: https://docs.maestro.dev/extra-materials/troubleshooting/known-issues
set -euo pipefail

UDID="${1:-}"
if [[ -z "$UDID" ]]; then
  UDID="$(xcrun simctl list devices booted | sed -nE 's/.*\(([A-F0-9-]+)\).*/\1/p' | head -1)"
fi

if [[ -z "$UDID" ]]; then
  echo "Nenhum simulador booted. Abra um (ex.: npx expo run:ios) ou passe o UDID." >&2
  exit 1
fi

DEVICE_DIR="$HOME/Library/Developer/CoreSimulator/Devices/$UDID/data"
EFFECTIVE="$DEVICE_DIR/Library/UserConfigurationProfiles/EffectiveUserSettings.plist"
USER_SETTINGS="$DEVICE_DIR/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles/UserSettings.plist"

for plist in "$EFFECTIVE" "$USER_SETTINGS"; do
  if [[ -f "$plist" ]]; then
    /usr/bin/plutil -replace restrictedBool.allowPasswordAutoFill.value -bool NO "$plist" 2>/dev/null \
      || /usr/bin/plutil -insert restrictedBool.allowPasswordAutoFill.value -bool NO "$plist" 2>/dev/null \
      || true
    echo "Atualizado: $plist"
  else
    echo "Ausente (ok se ainda não existe): $plist"
  fi
done

echo "AutoFill desligado para $UDID. Se o simulador já estava aberto, reinicie o app e rode o Maestro de novo."
