#!/usr/bin/env bash
# Rebuild rename/patches from the current tree so that `codemod + patches` reproduces it exactly.
#   0001 = mechanical fallout of the codemod (biome formatting, install-lock dedupe, test key), no so-agent decisions
#   0002 = everything so agent decided (the diff from that state to HEAD, excluding rename/)
# Needs: a clean committed HEAD, node 22 on PATH, this repo's node_modules (for biome), and an upstream checkout of the
# base commit (default: UPSTREAM_REPO=/workspace/so-agent-baseline or any clone containing BASE).
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${BASE:-6c384aa}"
UPSTREAM_REPO="${UPSTREAM_REPO:-/workspace/so-agent-baseline}"
[ -z "$(git status --porcelain -- . ':!bench/eval/results-*.json')" ] || { echo "commit or stash changes first" >&2; exit 1; }
repo="$PWD"; work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
git clone -q --no-checkout "$UPSTREAM_REPO" "$work/w" && cd "$work/w"
git checkout -q "$BASE"
G=(git -c user.name=regen -c user.email=regen@localhost)
cp -r "$repo/rename" . && rm -rf rename/patches && git add rename && "${G[@]}" commit -qm base
node rename/rename.mjs --root . >/dev/null && git add -A && "${G[@]}" commit -qm pure
ln -s "$repo/node_modules" node_modules
node node_modules/@biomejs/biome/bin/biome check --write . >/dev/null 2>&1 || true
rm node_modules
# Generated or test-key files the codemod cannot produce: take them from the final tree.
cp "$repo/packages/coding-agent/install-lock/package-lock.json" packages/coding-agent/install-lock/package-lock.json
cp "$repo/scripts/sync-versions.test.mjs" scripts/sync-versions.test.mjs
git add -A && "${G[@]}" commit -qm mech
git branch -f pure HEAD~1 && git branch -f mech HEAD
cd "$repo"
git fetch -q "$work/w" pure:refs/regen/pure mech:refs/regen/mech
rm -f rename/patches/*.patch
git diff --binary refs/regen/pure refs/regen/mech -- . ':!rename' > rename/patches/0001-mechanical-post-rename-fixes.patch
git diff --binary refs/regen/mech HEAD -- . ':!rename' > rename/patches/0002-so-agent-changes.patch
git update-ref -d refs/regen/pure; git update-ref -d refs/regen/mech
wc -c rename/patches/*.patch
