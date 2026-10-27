# Benchmarks

Everything here runs against a local mock provider, so no API key or network is needed.

```bash
npm ci --ignore-scripts && npm run build
# before/after: build the upstream or an earlier commit in another checkout, then compare
node bench/run.mjs --cli "$PWD/packages/coding-agent/dist/bundle/cli.js" --prefix SO --runs 21 --label so
node bench/run.mjs --cli /path/to/other/checkout/packages/coding-agent/dist/bundle/cli.js --prefix PI --runs 21 --label upstream
```

`--prefix` is the env var prefix of the build under test (`SO` for so agent, `PI` for upstream Pi).

`run.mjs` reports, as medians over `--runs` cold processes (plus one discarded warm-up):

- `firstRequestMs`: process spawn to the first byte of the first provider request. This is startup cost as a user
  would feel it before the model is even asked.
- `totalMs`: whole print-mode run with three model turns (a `bash` call, a `read` call, then a text answer).
- `peakRssMiB`: peak resident set size of the CLI process (`VmHWM`).
- `turns[]`: for every model request, the request body size, system prompt characters, tool schema characters,
  tool count, and message characters.

`--json out.json` also writes `out.request1.json` and `out.request3.json`, the exact request bodies, which can be
tokenized with any tokenizer to turn characters into tokens.

Other knobs: `BENCH_EXTRA_ENV='{"SO_TIMING":"1"}'`, `BENCH_NODE_ARGS="--cpu-prof --cpu-prof-dir=/tmp/prof"`,
`BENCH_SHOW_OUTPUT=1`.
