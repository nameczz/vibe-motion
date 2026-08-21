#!/bin/bash
# Double-click to run 3D Chladni as a local offline service.
cd "$(dirname "$0")" || exit 1
PORT=8777
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then echo "Need Python 3 (macOS ships it)."; read -r -n1 -p "Press any key..."; exit 1; fi
echo "3D Chladni -> http://localhost:$PORT   (close this window to stop)"
"$PY" -m http.server $PORT >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
open "http://localhost:$PORT/" 2>/dev/null || xdg-open "http://localhost:$PORT/" 2>/dev/null
wait $SRV
