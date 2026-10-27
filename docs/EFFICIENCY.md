# Efficiency work and fork changes

This is the honest account of what the fork changed beyond renaming, what was tried and reverted, and what was measured.
The first pass of this work traded capability for speed (a shorter system prompt, shorter tool descriptions, network
features switched off, files deleted). That was the wrong trade and most of it was reverted. The rule now: nothing that
removes functionality, model guidance, docs or user-facing behavior stays unless it is purely the rename or fixes a
fork-specific problem (the fix is then described below).

Reproduce every number with `bench/` (see `bench/README.md`). Upstream baseline: Pi 1.4.0 at `6c384aa`, built unchanged.
Machine: 8 vCPU Linux box, Node 22.23.4, mock OpenAI-compatible provider on localhost, medians of 31 cold runs after one
warm-up, two interleaved rounds.

## Results

| Metric | Upstream Pi 1.4.0 | so agent | Reading |
|---|---|---|---|
| `--version` | 171.5 ms | 23.5 ms | Floor: `node -e 0` is 20.7 ms. The launcher answers without loading the application. |
| Print mode, process start to first provider request | 234 / 238 ms | 235 / 238 ms | No change. Startup is about 150 ms of module evaluation and compile, 34 ms of `main()`, and 20 ms of Node itself. |
| Print mode, whole 3-turn run | 315 / 319 ms | 315 / 318 ms | No change. |
| Print mode, CPU time (user + system) | 396 / 401 ms | 393 / 400 ms | No change. |
| Print mode, peak RSS | 122 MiB | 117 MiB | -5 MiB (-4%): the interactive UI module graph is no longer evaluated in print and RPC runs. |
| Interactive TUI, first byte / screen settled | 219 / 357 ms and 212 / 350 ms | 219 / 358 ms and 224 / 363 ms | No change. |
| System prompt, tool schemas, tool descriptions | 2682 chars, 2841 chars | same text, with the names changed (2655 chars) | Not touched. |
| Request prefix stability across turns | n/a | stable | Every request starts with the previous request's tools, system prompt and messages byte for byte (`promptPrefixBreak: null`), so provider prompt caches work. Upstream's request has the same property. |
| npm tarball | 7.70 MB packed, 23.7 MB unpacked | 7.71 MB, 23.7 MB | Unchanged (the first pass shrank it by dropping sourcemaps and images; reverted). |

What limits these numbers. Wall time and CPU are dominated by evaluating and compiling the bundled module graph at start
(the compile cache already saves about 58 ms; the cpu profile shows the time spread flat over the model catalog, the
schema library, undici, the TUI and markdown libraries, with no single module above about 25 ms). Lazy mode loading
therefore moves work around without removing it: print mode skips the interactive graph, which shows up as memory, not
time. The only large win is the one that skips the application entirely (`--version`).

The honest conclusion: upstream was already tuned (lazy chunks, compile cache, graph budgets enforced by
`npm run check`, section-patch system prompts, truncated tool output with notes, provider cache markers). The lossless
headroom that remains at startup is single-digit milliseconds per item. I measured and dropped these:

- Deferring highlight.js language registration (12 ms of CPU in the profile): no measurable change in interactive
  start (357/350 vs 358/363 ms), so it was not kept.
- Lazy interactive-mode import in the interactive path: neutral.

## Kept changes (all lossless)

| Change | Where | Evidence |
|---|---|---|
| `so --version` / `-v` answers from the launcher | `scripts/build-coding-agent-bundle.mjs` | 171.5 -> 23.5 ms. Only when it is the sole argument and `SO_PACKAGE_DIR` is not set; everything else takes the normal path. `scripts/cli-launcher.test.mjs` checks the output equals the full path's output and that other invocations load the runtime. |
| Run modes imported on demand | `packages/coding-agent/src/main.ts` | RSS 122 -> 117 MiB. `scripts/cli-launcher.test.mjs` runs a real print-mode turn against the mock provider with a module resolution hook and asserts the `interactive-mode` chunk is never loaded. |
| Benchmarks | `bench/` | `run.mjs` (start, CPU, RSS, per-turn payload, prompt-prefix stability), `interactive.mjs` (TUI start in a pty), `mock-server.mjs`. |
| Catalog protocol pin | `remote-catalog-provider.ts` | so sends `pi-version=1.4.0` itself (`CATALOG_PROTOCOL_VERSION`). The server picks the revision a client can read from that parameter and only redirects clients that announce `pi/<version>`; so announces `so/<version>`, so without the pin it would get whatever revision is newest. Test: `model-catalog-protocol.test.ts`. |

## Audit of the first pass: keep, restore, or replace

| Earlier change | Verdict | What it is now, and why |
|---|---|---|
| Codemod renames (content, paths, env, scopes) | **Keep** | Pure rename. |
| Codemod deleted 12 items: issue templates, `APPROVED_CONTRIBUTORS`, 8 workflows, `scripts/issues/` | **Restore** (workflows: **replace**) | Everything is back. The 8 governance/publishing workflows are renamed to `*.yml.disabled` (`.github/workflows/DISABLED.md`): they use `github.repository`, so in a fork they would auto-close issues against upstream's contributor list, check upstream's staff team, and publish to upstream's infrastructure. Re-enable one by renaming it back after adapting it. `scripts/rename-codemod.test.mjs` pins this. |
| Codemod deduplicated the `@earendil-works/pi-*` and `@mariozechner/pi-*` import aliases | **Restore** | Pi extensions import those names. The loader, virtual modules, resource loader, coding-agent vitest config and the theme's old global key keep them as keys next to `@so-agent/*`, so existing Pi extensions load unchanged. Test: `scripts/rename-codemod.test.mjs`; upstream's own `11156-*-virtual-module` test still passes. |
| Removed the announcement component and `/dementedelves` | **Restore** | Back, with its text made accurate ("Pi, the project so agent is based on, has joined Earendil"); the blog link is unchanged. |
| Condensed system prompt (2682 -> 1890 chars) | **Restore** | Prompt quality was never evaluated on real models. Back to upstream's wording. |
| Condensed tool descriptions (edit tool) | **Restore** | Same. |
| Prompt size-budget test, boundaries-test fixture bump | **Drop** | They only existed for the shorter prompt. |
| Update feed off unless `SO_UPDATE_URL` | **Replace** | On by default again, as upstream. The upstream feed would offer, and `so update --self` would install, Pi (its answer carries Pi's package name). The default feed is now the npm registry entry of the installed package, which stays silent (404) until the package is published. `SO_UPDATE_URL` restores the upstream-style feed; `SO_SKIP_VERSION_CHECK` / `SO_OFFLINE` turn it off. Tests: `version-check.test.ts`. |
| Remote model catalog off unless `SO_CATALOG_URL` | **Restore** | On by default (`https://pi.dev`), as upstream, plus `SO_CATALOG_URL` to change the host and `SO_CATALOG_URL=off` to disable. Tests: `network-defaults.test.ts`, `model-catalog-protocol.test.ts`. |
| Install ping removed | **Replace** | Code, setting (`enableInstallTelemetry`, `SO_TELEMETRY`) and docs are back. The endpoint is `SO_INSTALL_REPORT_URL` with no default: the upstream counter would count so installs as Pi installs. Open question for you. Test: `network-defaults.test.ts`. |
| Post-update installer hint removed | **Replace** | Hint is back, printed only when `SO_INSTALLER_URL` / `SO_INSTALLER_PS1_URL` name an so installer (upstream's installer installs Pi). |
| "Could not determine latest version" message | **Keep (improved)** | Names the URL it looked at and `SO_UPDATE_URL`. |
| `--version` launcher fast path | **Keep** | See above; added the `SO_PACKAGE_DIR` guard and equivalence tests. |
| Lazy mode imports in `main.ts` | **Keep** | See above; added the real print-mode test. |
| Sourcemaps and `docs/images` left out of the npm tarball | **Restore** | The bundle is minified; without maps `--enable-source-maps` stack traces are useless. Tarball back to upstream's contents. |
| README, CONTRIBUTING, coding-agent README, quickstart rewritten | **Restore** | Upstream text with the names changed, plus a short fork notice at the top of README, CONTRIBUTING and the coding-agent README (the installer URLs in them install Pi, not so, and the npm packages are not published). Pictures still show Pi's logo: replace later. |
| SECURITY.md contact | **Keep** | Upstream's security mailbox would receive reports about the fork. It is kept as a pointer for issues in inherited code. |
| CHANGELOG fork notice | **Keep** | Additive. |
| `APP_TITLE` and the easter-egg logo changed from the pi symbol to "so" | **Keep** | Branding. |
| `SO_ATTRIBUTION.url` (OpenRouter `HTTP-Referer`) | **Keep** | Credits the so repository (placeholder `kevin9327/so-agent`) instead of Pi's site. |
| `repository.url` in 11 `package.json` files | **Keep** | Points at the placeholder so-agent repository instead of upstream. |
| Biome import/line-wrap fixes, `install-lock` duplicate-key cleanup, `legacy-ai` test key | **Keep** | Mechanical consequences of the rename (`rename/patches/0001`). |
| Test edits made for the removed behavior | **Replace** | Reverted to upstream's tests where the behavior is restored; new tests added for every kept or replaced change. |
| `docs/UPSTREAM-ENDPOINTS.md` | **Rewrite** | Lists each upstream URL and what so does with it. |

## Tests

Full `./test.sh` with `fd` on PATH and Node 22.23.4, compared with the unmodified upstream checkout:

| | Upstream Pi 1.4.0 | so agent |
|---|---|---|
| coding-agent (vitest) | 2766 passed, 1 failed, 50 skipped | 2774 passed, 1 failed, 50 skipped |
| root scripts (`node:test`) | 49 passed | 56 passed (new: codemod, launcher, print-mode laziness) |
| everything else (agent, ai, tui, codemode, mcp, chord, durable, evals, telemetry) | passes | passes |
| failures | `auth-storage.test.ts` "keeps a coalesced reload alive...", and six `packages/env` suites that need the Rust daemon (`npm run build:daemon`) | the same seven, and only those |

The `auth-storage` failure is environmental: the cache key for `auth.json` is `dev:ino:size:mtimeNs:ctimeNs`, and on
ext4 the timestamps move in 4 ms ticks, so two writes of the same size in one tick look identical. It does not fail on
filesystems with nanosecond timestamps. Left as is: a fix would change upstream's caching semantics, which other tests
depend on.

## Unverified

- Performance on a real provider and network (all numbers use a localhost mock). Startup numbers are from one machine.
- Whether `https://pi.dev` keeps serving so's `so/<version>` user agent; the pin was checked against the live server once.
- The npm registry default for updates has not run against a published `@so-agent/coding-agent` (the package does not exist yet).
