# A recorded session

Two real runs of so 0.0.2 against a **local Qwen3-4B-Instruct (Q4) model served by llama.cpp** on an 8-vCPU CPU-only box, no cloud model involved. They come from the eval harness in `bench/eval` (task files and checks are in `bench/eval/tasks.mjs`); the transcripts were rendered with `bench/eval/transcript-to-md.mjs`. Nothing was edited except line wrapping. A 4B model is weak; this shows the tool loop, not what a frontier model does with so. In the same eval so and the upstream baseline passed about the same share of tasks (12 of 21 vs 11 of 21 valid runs) (see `docs/EFFICIENCY.md`).

## Two files changed (22 s)

**You:** Change the default server port from 3000 to 8080 in config.js and update the README so it states the new default. Change nothing else.

`read` config.js

`read` README.md

> export const config = {
>   host: "localhost",
>   port: 3000,
> };

> # App
> 
> The server listens on port 3000 by default.

`edit` config.js

`edit` README.md

> Successfully replaced 1 block(s) in config.js.

> Successfully replaced 1 block(s) in README.md.

**so:** I've updated both files as requested:

1. Changed the default port in `config.js` from 3000 to 8080
2. Updated the README to reflect the new default port

Both changes are complete and accurate. The server now listens on port 8080 by default, as stated in the README.

## Create a file from a spec (22 s)

**You:** Create fizzbuzz.js (ES module) exporting fizzbuzz(n): returns 'FizzBuzz' for multiples of 15, 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, otherwise the number as a string.

`write` fizzbuzz.js (191 chars)

> Successfully wrote to fizzbuzz.js

**so:** Created `fizzbuzz.js` as an ES module that exports the `fizzbuzz(n)` function, which returns 'FizzBuzz' for multiples of 15, 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, and the number as a string otherwise.

## Record your own

```bash
node bench/eval/run-eval.mjs --build so=$PWD/packages/coding-agent/dist/bundle/cli.js:SO --base-url http://127.0.0.1:8081/v1 --model <model> --tasks create-fizzbuzz --transcripts out/
node bench/eval/transcript-to-md.mjs out/so-create-fizzbuzz-r0-a1.jsonl "<prompt>"
```
