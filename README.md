# so agent

**so agent** (`so`) is a minimal, extensible terminal coding agent. It is a fork of
[Pi](https://github.com/earendil-works/pi) by Mario Zechner and contributors (MIT), renamed and tuned
for lower startup cost and smaller prompts. See [ATTRIBUTION.md](ATTRIBUTION.md) and
[docs/EFFICIENCY.md](docs/EFFICIENCY.md).

Customize `so` with [extensions](packages/coding-agent/docs/extensions.md), [skills](packages/coding-agent/docs/skills.md), [prompt templates](packages/coding-agent/docs/prompt-templates.md), and [themes](packages/coding-agent/docs/themes.md). Bundle them as [so packages](packages/coding-agent/docs/packages.md) and share via npm or git.

Use `so` [interactively](packages/coding-agent/docs/usage.md), automate it in [print or JSON mode](packages/coding-agent/docs/cli.md), control it over [RPC](packages/coding-agent/docs/rpc.md), or build apps with the [TypeScript SDK](packages/coding-agent/docs/sdk.md).

## Getting started

so agent is not published to npm or any installer host yet. Build it from source (Node.js 22.19 or newer):

```bash
git clone <your so-agent repository> so-agent && cd so-agent
npm ci --ignore-scripts
npm run build
node packages/coding-agent/dist/bundle/cli.js        # or: ./so-test.sh
```

Link the `so` command globally:

```bash
npm link --ignore-scripts ./packages/coding-agent    # provides the `so` binary
cd /path/to/project
so
```

Run `/login` inside `so` to connect a subscription or API key. Configuration lives in `~/.so/agent/`
(project-local files in `.so/`), and environment variables use the `SO_` prefix
(see [environment variables](packages/coding-agent/docs/environment-variables.md)).

so agent does not contact any so-specific hosted service. Update checks, the remote model catalog,
and install reporting are off unless you opt in. See [docs/UPSTREAM-ENDPOINTS.md](docs/UPSTREAM-ENDPOINTS.md).

## Packages

This monorepo contains the So CLI and its supporting libraries.

| Package | Description |
|---------|-------------|
| **[@so-agent/chord](packages/chord)** | Typed host runtime for hot-reloadable plugins, contracts, replicated state, and RPC over JSON links |
| **[@so-agent/telemetry](packages/telemetry)** | Vendor-neutral telemetry contracts, reference adapter, conformance tests, and typed schemas |
| **[@so-agent/ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google, etc.) |
| **[@so-agent/durable](packages/durable)** | Durable conversation, task, and document runtime |
| **[@so-agent/agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@so-agent/coding-agent](packages/coding-agent)** | Interactive coding agent CLI |
| **[@so-agent/tui](packages/tui)** | Terminal UI library with differential rendering |

## Permissions & Containerization

So does not include a built-in permission system for restricting filesystem, process, network, or credential access. By default, it runs with the permissions of the user and process that launched it.

If you need stronger boundaries, containerize or sandbox So. See [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md) for three patterns:

- **Gondolin extension**: keep `so` and provider auth on the host while routing built-in tools and `!` commands into a local Linux micro-VM.
- **Plain Docker**: run the whole `so` process in a local container for simple isolation.
- **OpenShell**: run the whole `so` process in a policy-controlled sandbox.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for project rules (for both humans and agents).

## Development

```bash
npm install --ignore-scripts  # Install all dependencies without running lifecycle scripts
npm run build         # Refresh model data, then build all packages
npm run build:offline # Rebuild using existing model data without network access
npm run check         # Lint, format, and type check
./test.sh            # Run tests (skips LLM-dependent tests without API keys)
./so-test.sh         # Run so from sources (can be run from any directory)
```

### Using local packages outside the monorepo

Build every public package into one coherent local artifact set:

```bash
npm run pack:packages -- --out .artifacts/so-packages
```

This refreshes model data before building `so-ai`. To avoid network access when
model data is already hydrated, pass `--offline-model-data`.

Then configure an external project to consume one package and resolve all of
its So dependencies from the same artifact set. npm is the default:

```bash
node scripts/use-local-packages.mjs \
  --manifest .artifacts/so-packages/manifest.json \
  --consumer ../my-project \
  --package @so-agent/durable \
  --package @so-agent/agent-core
cd ../my-project
npm install --ignore-scripts
```

For a pnpm project, point `--consumer` at the workspace root:

```bash
node scripts/use-local-packages.mjs \
  --manifest .artifacts/so-packages/manifest.json \
  --consumer ../my-project \
  --package @so-agent/agent-core \
  --package-manager pnpm
cd ../my-project
pnpm install --ignore-scripts
```

Repeat `--package` for each direct dependency. The command updates the
consumer's `package.json` with content-addressed local `file:` references. It
writes transitive overrides to `package.json` for npm or `pnpm-workspace.yaml`
for pnpm. Keep the artifact directory available while installing or updating
the consumer. Re-run both commands after changing So source.

## Building standalone binaries from release source

GitHub releases include a versioned source archive covered by the release's `SHA256SUMS` file. Extract it and run the same build script used for the official standalone binaries:

```bash
VERSION="<release-version>"
tar -xzf "so-${VERSION}-source.tar.gz"
cd "so-${VERSION}"
./scripts/build-binaries.sh --offline-model-data --platform linux-x64 --out "$PWD/out"
```

The archive includes release model data and native prebuilds. `--offline-model-data` uses that model data without refreshing provider catalogs. The script installs dependencies and builds the executable with its runtime assets; pass `--skip-install` if dependencies are already provided.

## Supply-chain hardening

We treat npm dependency changes as reviewed code changes.

- Direct external dependencies are pinned to exact versions. Internal workspace packages remain version-ranged.
- `.npmrc` sets `save-exact=true` and `min-release-age=2` to avoid same-day dependency releases during npm resolution.
- `package-lock.json` is the dependency ground truth. Pre-commit blocks accidental lockfile commits unless `SO_ALLOW_LOCKFILE_CHANGE=1` is set.
- `npm run check` verifies pinned direct deps, native TypeScript import compatibility, and the generated coding-agent install lock.
- The managed installer (not shipped by so agent) would install from `packages/coding-agent/install-lock/`, generated from the root lockfile, to pin transitive deps. The npm package does not pin transitive deps.
- Local release smoke tests and npm publication use the same tarball packer; npm publishes the validated tarballs rather than repacking workspace directories.
- Local release installs, documented npm installs, and `so update --self` use `--ignore-scripts` where supported.
- CI installs with `npm ci --ignore-scripts`, and a scheduled GitHub workflow runs `npm audit --omit=dev` plus `npm audit signatures --omit=dev`.
- Install lock generation has an explicit allowlist for dependency lifecycle scripts; new lifecycle-script deps fail checks until reviewed.

## Renaming and upstream updates

The whole rename from Pi is reproducible: run `rename/rename.sh` on a fresh upstream checkout.
See [rename/README.md](rename/README.md).

## License

MIT. The original copyright notice (Mario Zechner) is kept in [LICENSE](LICENSE).
