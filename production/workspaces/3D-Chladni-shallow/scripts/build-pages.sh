#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/.pages}"

if [[ "$OUT" == "$ROOT" || "$OUT" == "/" || -z "$OUT" ]]; then
  echo "Refusing to replace unsafe Pages output path: $OUT" >&2
  exit 1
fi

rm -rf -- "$OUT"
mkdir -p "$OUT"
cp "$ROOT/index.html" "$OUT/index.html"
cp -R "$ROOT/app" "$OUT/app"
cp -R "$ROOT/website" "$OUT/website"
cp "$ROOT/LICENSE" "$OUT/LICENSE"
cp "$ROOT/ASSET_LICENSE.md" "$OUT/ASSET_LICENSE.md"
cp "$ROOT/THIRD_PARTY_NOTICES.md" "$OUT/THIRD_PARTY_NOTICES.md"
cp -R "$ROOT/LICENSES" "$OUT/LICENSES"
find "$OUT" -name .DS_Store -delete

printf 'Built GitHub Pages artifact: %s\n' "$OUT"
