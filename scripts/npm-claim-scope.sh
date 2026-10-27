#!/usr/bin/env bash
# Reserve the @so-agent npm scope names with inert placeholder packages (version 0.0.0, dist-tag "placeholder").
#
# The scope itself is held by the npm user or organization called "so-agent": create that first (free, public
# packages only) at https://www.npmjs.com/org/create. Publishing placeholders is optional on top of that; it
# also reserves the individual package names. Placeholders use 0.0.0 on purpose: the first real release is 0.0.1
# and a published version number can never be reused.
#
#   scripts/npm-claim-scope.sh              dry run: checks login/scope, builds the placeholders, publishes nothing
#   scripts/npm-claim-scope.sh --publish    publishes them (npm asks for your 2FA code when needed)
set -euo pipefail

SCOPE="@so-agent"
NAMES=(agent-core ai chord codemode coding-agent durable env evals mcp telemetry tui)
REPO_URL="git+https://github.com/kevin9327/so-agent.git"   # placeholder repo URL, change when the repo exists
mode="dry-run"; [ "${1:-}" = "--publish" ] && mode="publish"

user="$(npm whoami 2>/dev/null || true)"
if [ -z "$user" ]; then
  echo "Not logged in to npm. Run 'npm login' (account with 2FA enabled), then run this script again." >&2
  exit 1
fi
echo "npm user: $user"

if npm org ls "${SCOPE#@}" "$user" >/dev/null 2>&1 || [ "$user" = "${SCOPE#@}" ]; then
  echo "Scope $SCOPE: you are a member/owner."
else
  echo "Scope $SCOPE: this account is not a member of an org or user named '${SCOPE#@}'." >&2
  echo "Create the org first: https://www.npmjs.com/org/create (name: ${SCOPE#@}, free plan, public packages)." >&2
  [ "$mode" = "publish" ] && exit 1
fi

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
for n in "${NAMES[@]}"; do
  d="$work/$n"; mkdir -p "$d"
  cat >"$d/package.json" <<JSON
{
  "name": "$SCOPE/$n",
  "version": "0.0.0",
  "description": "Name reservation for so agent. The first real release is 0.0.1.",
  "license": "MIT",
  "repository": { "type": "git", "url": "$REPO_URL" },
  "publishConfig": { "access": "public", "tag": "placeholder" }
}
JSON
  printf '# %s/%s\n\nName reservation for so agent. Not a release.\n' "$SCOPE" "$n" >"$d/README.md"
  if [ "$mode" = "publish" ]; then
    (cd "$d" && npm publish --access public --tag placeholder)
  else
    (cd "$d" && npm publish --dry-run --access public --tag placeholder 2>&1 | tail -n 3)
  fi
done
echo "Done ($mode)."
