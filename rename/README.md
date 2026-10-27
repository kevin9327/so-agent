# Reproducible rename (Pi -> so agent)

`rename.sh` rewrites a fresh upstream checkout into so agent:

```bash
git clone --depth 1 https://github.com/earendil-works/pi so-agent && cd so-agent   # read-only clone
cp -r <this repo>/rename ./rename && git add rename
rename/rename.sh                      # codemod: content, paths, removals
git apply rename/patches/*.patch      # hand-written post-rename fixes (docs, upstream decoupling)
npm ci --ignore-scripts && npm run build
```

What `rename.mjs` does (idempotent, works on `git ls-files` text files):

| From | To |
|---|---|
| `@earendil-works/pi-X`, `@mariozechner/pi-X` | `@so-agent/X` |
| `@earendil-works/*` | `@so-agent/*` |
| `PI_*` env vars | `SO_*` |
| `pi`, `Pi`, `PI` as a word (including `.pi`, `pi-ai`, `pi.on`) | `so`, `So`, `SO` |
| camelCase `piX`, `PiX`, `getPiX` | `soX`, `SoX`, `getSoX` |
| `pi-mono` / `pi-monorepo` | `so-agent` / `so-agent-monorepo` |
| file names with those tokens | same rules |

Not touched: `LICENSE`, `ATTRIBUTION.md`, `CHANGELOG.md` files, `packages/mcp/LICENSES`, test fixtures,
`scripts/model-catalog-protocol*`, upstream URLs (`pi.dev`, `github.com/earendil-works|badlogic/...`), base64 blobs,
and words such as `pipe`, `api`, `pixel`, `Math.PI`.

It also deletes upstream-only infrastructure (issue gate and triage workflows, issue templates, the Earendil
announcement component). Legacy `@mariozechner/*` import aliases collapse into the `@so-agent/*` ones.

`rename/check-residual.sh` greps the tree for leftover branding outside that allowlist.
