#!/usr/bin/env bash
# One-command install of so agent from source (not on npm yet).
#   curl -fsSL https://raw.githubusercontent.com/kevin9327/so-agent/main/install.sh | bash
# Env: SO_AGENT_DIR (default ~/.so-agent/src), SO_BIN_DIR (default ~/.local/bin), SO_REF (default main)
set -euo pipefail
dir="${SO_AGENT_DIR:-$HOME/.so-agent/src}"
bin="${SO_BIN_DIR:-$HOME/.local/bin}"
ref="${SO_REF:-main}"
command -v git >/dev/null || { echo "so install: git is required" >&2; exit 1; }
command -v node >/dev/null || { echo "so install: Node.js 22.19+ is required" >&2; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=19)?0:1)' \
  || { echo "so install: Node.js 22.19+ is required (found $(node -v))" >&2; exit 1; }
if [ -d "$dir/.git" ]; then
  git -C "$dir" fetch --depth 1 origin "$ref" && git -C "$dir" checkout -q FETCH_HEAD
else
  mkdir -p "$(dirname "$dir")"
  git clone --depth 1 --branch "$ref" https://github.com/kevin9327/so-agent "$dir"
fi
cd "$dir"
npm ci --ignore-scripts --no-audit --no-fund
npm run build:offline
mkdir -p "$bin"
cat > "$bin/so" <<SH
#!/usr/bin/env sh
exec node "$dir/packages/coding-agent/dist/bundle/cli.js" "\$@"
SH
chmod +x "$bin/so"
echo "so agent installed: $bin/so ($("$bin/so" --version))"
case ":$PATH:" in *":$bin:"*) ;; *) echo "Add $bin to your PATH, e.g. export PATH=\"$bin:\$PATH\"";; esac
