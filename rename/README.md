# Reproducible rename (Pi -> so agent)

`rename.sh` rewrites a fresh upstream checkout into so agent:

```bash
git clone --depth 1 https://github.com/earendil-works/pi so-agent && cd so-agent   # read-only clone
cp -r <this repo>/rename ./rename && git add rename
rename/rename.sh                      # codemod, then every rename/patches/*.patch in order
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

Nothing is deleted. Upstream's issue/PR governance and publishing workflows are renamed to `*.yml.disabled`
(`DISABLED_WORKFLOWS`; see `.github/workflows/DISABLED.md` in the result) because they would act on this repository
as if it were upstream. Pi extensions keep working: the alias tables that map `@earendil-works/pi-*` and
`@mariozechner/pi-*` imports (extension loader, virtual modules, resource loader, the coding-agent vitest config, the
theme's old global key) keep those names as keys next to the new `@so-agent/*` ones (`LEGACY_KEY_LINES`).

## Patches

`rename/patches/` holds what is not a pure rename, applied in order by `rename.sh`:

1. `0001-mechanical-post-rename-fixes.patch`: `biome check --write` output (import order and line wrapping after the
   renames), the deduplicated `install-lock/package-lock.json` and the `legacy-ai` key of `sync-versions.test.mjs`.
   Regenerate it on a pure-codemod checkout with `npx biome check --write .` plus those two files.
2. `0002-so-agent-changes.patch`: the intentional differences (fork notices, `SO_*` network settings, launcher fast path,
   lazy modes, tests, benchmarks, docs). `docs/EFFICIENCY.md` lists each with its reasoning.

When upstream moves, run the codemod on the new upstream tree, fix patch conflicts by hand (`git apply --3way`), and
regenerate both patches from `git diff`. Merge the catalog protocol version too: `CATALOG_PROTOCOL_VERSION` in
`packages/coding-agent/src/core/remote-catalog-provider.ts` names the upstream Pi release this fork implements.

`rename/check-residual.sh` greps the tree for leftover branding outside that allowlist.
