#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
PYTHON=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then PYTHON="$candidate"; break; fi
done
if [ -z "$PYTHON" ]; then
  echo "Python 3.10 or newer was not found."
  exit 1
fi
"$PYTHON" tools/doctor.py
"$PYTHON" tools/build_preview.py
"$PYTHON" tools/verify_build.py
exec "$PYTHON" -m egglands.server.app
