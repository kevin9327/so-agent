#!/usr/bin/env bash
# Print leftover Pi branding outside the intentional allowlist. Exit 1 if any is found.
cd "$(dirname "$0")/.."
out=$(rg -n --no-heading --with-filename --hidden -P \
  -g '!.git' -g '!node_modules' -g '!**/CHANGELOG.md' -g '!**/test/fixtures/**' -g '!LICENSE' -g '!ATTRIBUTION.md' \
  -g '!rename/**' -g '!packages/mcp/LICENSES/**' -g '!package-lock.json' -g '!scripts/*model-catalog*' -g '!packages/coding-agent/test/model-catalog-protocol.test.ts' \
  -g '!docs/UPSTREAM-ENDPOINTS.md' -g '!scripts/rename-codemod.test.mjs' -g '!docs/EFFICIENCY.md' -g '!docs/VERSIONING.md' -g '!docs/UPSTREAM-README-SECTIONS.md' -g '!assets/**' -g '!bench/**' -g '!**/dist/**' -g '!profiles-*/**' -g '!.artifacts/**' \
  -e '(?<![A-Za-z0-9.])(?:[Pp]i|PI)(?![A-Za-z0-9])|(?<![A-Za-z0-9])PI_|(?<![A-Za-z0-9])pi(?=[A-Z])|(?<![A-Za-z0-9])Pi(?=[A-Z])|(?<=[a-z0-9])Pi(?=[A-Z]|(?![A-Za-z0-9]))|@earendil-works|@mariozechner|pi-mono' . \
  | rg -v '^\./(packages/coding-agent/(src/core/(extensions/(loader|virtual-modules)|resource-loader)\.ts|src/modes/interactive/theme/theme\.ts|vitest\.config\.ts)):[0-9]+:.*@(earendil-works|mariozechner)|@earendil-works/gondolin|same agent as Pi 1\.4\.0|between so and Pi|\| Pi 1\.4\.0 \||from a Pi checkout|upstream \(Pi\)|fork of Pi|from Pi \(|install Pi|installs Pi|as Pi installs|Pi, the project|rfc\.earendil\.com|pi\.dev|github\.com/(earendil-works|badlogic|badlogicgames)|earendil-works/pi|badlogic/pi|pi-version|perl -0pi|huggingface\.co|x\.com/badlogic|upstream Pi|rename from Pi|LEGACY_REPO_RE' || true)
if [ -n "$out" ]; then echo "$out"; exit 1; fi
echo "no residual Pi branding outside the allowlist"
