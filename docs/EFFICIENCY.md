# Efficiency work

Baseline: upstream Pi at commit `6c384aa` (1.4.0), built with the same Node and run on the same machine as so agent.
All numbers come from `bench/run.mjs` (see [bench/README.md](../bench/README.md)) against a local mock provider
unless stated otherwise. Machine: 8 vCPU Linux box, Node v22.23.4, warm disk cache, compile cache enabled.
`node -e 0` takes 19 ms here, which is the floor for any Node CLI.

## Results

| Metric | Upstream Pi | so agent | Change |
|---|---|---|---|
| `--version` wall time (median of 40) | 167 ms | 24 ms | -86% (7x) |
| Fixed prompt prefix per model turn, o200k tokens (system prompt + 4 tool schemas) | 1205 | 974 | -19% |
| System prompt characters | 2682 | 1890 | -30% |
| Tool schema characters | 2841 | 2509 | -12% |
| npm tarball (`npm pack`) packed / unpacked | 7.70 MB / 23.7 MB | 4.16 MB / 15.8 MB | -46% / -34% |
| Process start to first provider request (median of 41, two rounds) | 236 / 231 ms | 227 / 228 ms | about -3% (near noise) |
| Print-mode run, 3 turns (median of 41, two rounds) | 319 / 313 ms | 306 / 306 ms | about -3% |
| Peak RSS, print mode | 122 MiB | 117 MiB | -4% |
| Bundle size (`dist/bundle`) | 9.0 MiB | 9.0 MiB | none |

The prompt measurement includes a few characters of path length difference (the upstream checkout path is
longer); it is under 30 characters. Tokens were counted with `gpt-tokenizer` (o200k_base) on the real request bodies.

## What each change does, and what limits the number

### 1. Condensed fixed prompt (-231 tokens on every turn)

The prefix is resent on every turn, so every token saved is saved on every model call (provider prompt caching
makes repeated prefix tokens cheaper, not free, and the first call and every cache miss pay full price).

- The `<docs>` section listed a file for each of 13 topics in prose, about 1250 characters, although the model reads
  it only when asked about the harness itself. It is now three lines that name the same files by pattern
  (`docs/<topic>.md`) and keep the three behavioral rules: resolve paths against the docs root, read completely,
  follow cross-references.
- The edit tool stated the "match the original file, do not overlap, merge nearby changes" rule up to six times: in
  four system rules, the tool description and two parameter descriptions. It now states it in the tool
  description and parameter descriptions (where the model sees it next to the schema) and in two short rules.

What limits it: the remaining 974 tokens are the tool schemas (547) and the rules that change behavior. The
read, bash and write descriptions and the four rule bullets are already short; cutting more removes information, not
repetition. Risk: this is a prompt change. I could not run a model-quality evaluation here, so edit accuracy on real
models is unverified. `test/system-prompt.test.ts` pins a size budget and the single statement of the edit rule.

### 2. `so --version` skips the application (-143 ms)

The bundle launcher now prints the version from `package.json` when `--version` or `-v` is the only argument and
falls back to the normal path otherwise. Before, it evaluated the whole 12 MB module graph first. What limits it: 19 ms
Node boot plus a small `package.json` read. Covered by `scripts/cli-launcher.test.mjs`, which checks that the
runtime is not loaded for `--version` and is loaded for everything else.

### 3. Modes load on demand (-5 MiB RSS, a few ms)

`main.ts` imported the interactive UI, print mode and RPC mode statically. Each is now imported when its mode runs,
so print and RPC runs do not evaluate `interactive-mode.ts`. The gain is small because the TUI library and the
built-in tool renderers are still needed in every mode.

What limits startup (profile of the upstream bundle, 195 ms with profiler overhead): about 19 ms Node boot, about
150 ms evaluating the module graph (ESM compilation 21 ms, TUI/highlight/markdown top level 27 ms, core and model
data 11 ms, GC 10 ms, the rest spread over many modules), and 34 ms in `main()` (28 ms to create the session runtime).
The compile cache already saves 58 ms (226 ms without it). Removing more needs a different structure (a V8 startup
snapshot or splitting the TUI out of non-interactive runs), which I did not attempt.

### 4. Smaller npm tarball (-3.5 MB packed, -7.9 MB unpacked)

`files` now excludes `dist/**/*.map` (5.5 MB of sourcemaps for the unbundled build) and `docs/images` (2.9 MB of
documentation screenshots). Docs, examples, the changelog, schemas and runtime assets still ship.
`scripts/package-contents.test.mjs` pins this. What limits it: the 9 MB bundle (about 3 MB is generated model data and
provider SDKs) and the unbundled `dist/` that SDK users import.

## Not changed

- Bundle size and startup of the TUI path: see above.
- Tool output limits (2000 lines / 50 KB) and compaction: changing them changes behavior, not just cost.
- Provider cache hints: untouched. Verifying them needs live provider calls.
- Upstream network calls at startup (update check, remote model catalog, install ping) are now off by default. That
  was a decoupling decision, not a measured gain: they run in the background, so they did not delay the first request.

## Reproduce

```bash
git clone --depth 1 https://github.com/earendil-works/pi /tmp/pi-baseline   # read-only
(cd /tmp/pi-baseline && npm ci --ignore-scripts && npm run build)
npm ci --ignore-scripts && npm run build
node bench/run.mjs --cli /tmp/pi-baseline/packages/coding-agent/dist/bundle/cli.js --prefix PI --runs 41 --label upstream
node bench/run.mjs --cli "$PWD/packages/coding-agent/dist/bundle/cli.js" --prefix SO --runs 41 --label so
```
