#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/build/mac-lock-launcher/3D Chladni Lock.app"
DESTINATION="/Applications/3D Chladni Lock.app"
COLLIDING_DESTINATION="/Applications/3D Chladni.app"
PREVIOUS_DESTINATION="/Applications/3D Chladni Plate.app"
LEGACY_DESTINATION="/Applications/Sound Motion Lock.app"

"$ROOT/scripts/build-mac-lock-launcher.sh"
pkill -x "Sound Motion Lock" 2>/dev/null || true
pkill -x "3D Chladni Plate" 2>/dev/null || true
pkill -x "3D Chladni Lock" 2>/dev/null || true
rm -rf "$DESTINATION"
ditto "$SOURCE" "$DESTINATION"
codesign --verify --deep --strict "$DESTINATION"
rm -rf "$PREVIOUS_DESTINATION" "$LEGACY_DESTINATION"

if [[ -d "$COLLIDING_DESTINATION" ]] && \
   [[ "$(plutil -extract CFBundleIdentifier raw -o - "$COLLIDING_DESTINATION/Contents/Info.plist" 2>/dev/null || true)" == "com.lykno.soundmotion.lock" ]]; then
  rm -rf "$COLLIDING_DESTINATION"
fi

echo "$DESTINATION"
