#!/usr/bin/env bash
# Reproducible rename of upstream Pi -> so agent. Run from a clean git checkout of upstream.
#   rename/rename.sh [root]
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="${1:-$(dirname "$here")}"
node "$here/rename.mjs" --root "$root"
