# Prompt / behavior evaluation against a real model

`bench/run.mjs` measures cost with a mock provider. This directory measures **behavior** with a real one: the same fixed
tasks and prompts are given to two builds of the CLI (upstream Pi baseline and so agent) through one OpenAI-compatible
endpoint, and the end state of each task directory is checked.

| File | Purpose |
|---|---|
| `tasks.mjs` | 6 small coding tasks (bug fix, add function, rename across files, count over files, create JSON, edge-case fix). Each has a check on the end state only and a reference solution. `scripts/eval-tasks.test.mjs` proves each check fails on the start state and passes on the reference solution. |
| `run-eval.mjs` | Runs every task for every build (build order alternates per task), in `--mode json`, and records success, turns, tool calls, tool errors, input/output/cache tokens, first-request input tokens, wall time and provider errors. |
| `throttle-proxy.mjs` | Optional local pass-through for endpoints with a hard rate limit (for example anonymous free tiers). Spaces calls and waits out rate-limit answers; never edits request bodies. |

## Run it

```bash
export PATH=<node 22 bin>:$PATH
# 1. Build both: the so repo (npm run build) and an unmodified upstream checkout (the baseline).
# 2. Any OpenAI-compatible endpoint:
export EVAL_API_KEY=...                       # only if the endpoint needs one
node bench/eval/run-eval.mjs \
  --build upstream=/path/to/baseline/packages/coding-agent/dist/bundle/cli.js:PI \
  --build so=$PWD/packages/coding-agent/dist/bundle/cli.js:SO \
  --base-url https://api.example.com/v1 --model some-model --api-key-env EVAL_API_KEY \
  --runs 5 --out eval-results.json
```

Add `--reasoning` for reasoning models, `--thinking <level>` to set the thinking level, `--tasks id1,id2` to select tasks.
With a rate-limited endpoint, start `throttle-proxy.mjs --upstream <url> --port 8787 --min-interval-ms 31000` and use
`--base-url http://127.0.0.1:8787/v1`.

## Reading the numbers

- With one task and a stochastic model, a run is a sample, not a measurement. Use `--runs 5` or more per task and compare
  pass counts, not single runs. Two builds that send the same prompt should land within sampling noise of each other.
- The two builds' prompts differ only by the rename (the product name and paths inside the prompt text), so this harness
  detects regressions, not improvements.
- Tokens come from the provider's `usage`. If the endpoint injects its own system prompt (some free gateways do), it adds
  the same amount to both builds.
- Results of a run are kept next to the results JSON; `docs/EFFICIENCY.md` records the one that was done for this repo and
  its caveats.

## Summaries, transcripts, results

- `node bench/eval/summarize.mjs bench/eval/results/*.json` merges result files into a per-task pass table.
- `--transcripts <dir>` on `run-eval.mjs` saves each run's JSON event stream; `node bench/eval/transcript-to-md.mjs <file.jsonl> "<prompt>"` renders one as Markdown (see `docs/demo.md`).
- Committed results live in `bench/eval/results/`.
