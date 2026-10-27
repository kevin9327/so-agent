#!/usr/bin/env bash
# Reproducible rename of upstream Pi -> so agent. Run from a clean git checkout of upstream
# that already contains this rename/ directory (git add'ed).
#   rename/rename.sh [root]
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="${1:-$(dirname "$here")}"
node "$here/rename.mjs" --root "$root"
for p in "$here"/patches/*.patch; do
	[ -e "$p" ] || continue
	git -C "$root" apply --3way "$p"
	echo "applied $(basename "$p")"
done
