# Versioning

so agent starts at **0.0.1**. Every workspace package, the install lockfile (`packages/coding-agent/install-lock`) and the
root lockfile carry the same version; `scripts/sync-versions.js` keeps them in lockstep. `SO_AI_VERSION`
(`packages/ai/src/utils/version.ts`) and the HTTP user agent (`so/<version>`) follow `packages/coding-agent/package.json`.

Upstream Pi 1.4.0 (`6c384aa`) is the code base, and the first so release is a rename of it, so these things are
deliberately **not** reset:

| Thing | Value | Why |
|---|---|---|
| `CATALOG_PROTOCOL_VERSION` (`remote-catalog-provider.ts`) | `1.4.0` | The model catalog server picks a catalog revision from `pi-version`. A `0.0.x` value would select an old revision. Raise it only when so implements a newer upstream catalog protocol. |
| Upstream history in `packages/coding-agent/CHANGELOG.md` | `[1.4.0]` and older, verbatim | History is kept. so's own entries sit above it, starting at `[0.0.1]`. |
| `ATTRIBUTION.md` | Pi 1.4.0 | Names the upstream version this fork is based on. |

Startup "what's new" shows only changelog entries newer than the last version you ran **and not newer than the running
version** (`getNewEntries(entries, lastVersion, VERSION)`), so a so 0.0.x release never announces Pi's 1.x history.
Keep so's version below Pi's oldest kept entry (0.79.0 today) or move the upstream history out of that file before so's
version passes it.

Releasing: bump with `npm run version:patch|minor|major` (upstream's script, which also runs `sync-versions`), add a
`## [x.y.z]` entry above `[1.4.0]` in the changelog (required: the startup "what's new" and the install report only fire when the changelog has an entry newer than the last version seen), regenerate the install lock
(`node scripts/generate-coding-agent-install-lock.mjs`).
