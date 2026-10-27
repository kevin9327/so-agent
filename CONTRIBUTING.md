# Contributing to so agent

so agent is a fork of [Pi](https://github.com/earendil-works/pi) (see [ATTRIBUTION.md](ATTRIBUTION.md)). Issues and pull requests are welcome; there is no contribution gate on this fork.

## What helps most

- **Bug reports with a reproduction.** Use the issue template. Run `so -ne` first to rule out an extension.
- **Real-model results.** Run `bench/eval` against a model you have and post the table (see [bench/eval/README.md](bench/eval/README.md)). More models and more runs are worth more than opinions.
- **Lossless improvements**: a fix or speedup that removes nothing, has a test, and comes with a before/after number (`bench/run.mjs`, `bench/eval`). See how the existing ones are written up in [docs/EFFICIENCY.md](docs/EFFICIENCY.md) and the [changelog](packages/coding-agent/CHANGELOG.md).
- **Docs and examples.**

## Ground rules

1. **Understand your code.** You must be able to explain what a change does. AI-assisted code is fine; unreviewed generated code is not.
2. **The core stays minimal.** Features that fit an extension should be an extension (see [packages/coding-agent/docs/extensions.md](packages/coding-agent/docs/extensions.md)).
3. **Do not remove behavior or model guidance** to win a benchmark. Changes to the system prompt or tool descriptions need an eval showing no regression.
4. **Keep the fork reproducible.** The rename from upstream is `rename/rename.sh` (codemod plus `rename/patches`). After a change, `rename/regenerate-patches.sh` rebuilds the patches; do not edit the patch files by hand.
5. **Credit upstream.** Do not remove the license, [ATTRIBUTION.md](ATTRIBUTION.md) or upstream's changelog history.

## Before you open a pull request

```bash
npm ci --ignore-scripts
npm run check        # lint, format, type check, entry-graph budgets, install-lock check
./test.sh            # tests (LLM-dependent tests are skipped without API keys; needs `fd` on PATH)
```

Known failures that also fail on upstream's baseline in this environment: `auth-storage` "keeps a coalesced reload alive" (filesystem timestamp resolution) and the six `packages/env` suites that need the Rust daemon build.

Add a `CHANGELOG.md` entry under the next version in `packages/coding-agent/CHANGELOG.md` for user-visible changes. Do not bump versions in a pull request; the maintainer does that when releasing ([docs/VERSIONING.md](docs/VERSIONING.md)).

## Security

Report vulnerabilities as described in [SECURITY.md](SECURITY.md), not in public issues.

## Upstream

Project rules for agents and humans are in [AGENTS.md](AGENTS.md). Upstream's own contributing guide is kept in [docs/UPSTREAM-CONTRIBUTING.md](docs/UPSTREAM-CONTRIBUTING.md).
