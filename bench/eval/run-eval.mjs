#!/usr/bin/env node
// Same fixed tasks, same prompts, two builds of the CLI (upstream baseline vs so), one OpenAI-compatible endpoint.
// Measures per run: success (end-state check), turns, tool calls, tokens (total and first request), wall time, errors.
//
//   node bench/eval/run-eval.mjs \
//     --build upstream=/path/to/baseline/packages/coding-agent/dist/bundle/cli.js:PI \
//     --build so=/path/to/so/packages/coding-agent/dist/bundle/cli.js:SO \
//     --base-url https://api.example.com/v1 --model some-model [--api-key-env EXAMPLE_API_KEY] \
//     [--runs 3] [--retry-invalid 2] [--max-tokens 8192] [--transcripts dir] [--tasks fix-off-by-one,add-function] [--reasoning] [--timeout-ms 600000] [--out results.json]
//
// The API key is read from the named environment variable and written only to a temp models.json that is deleted at the
// end. Each build gets the same temp project (re-created per run); build order alternates per task to spread drift.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { tasks as allTasks } from "./tasks.mjs";

const args = process.argv.slice(2);
const all = (n) => args.flatMap((a, i) => (a === `--${n}` ? [args[i + 1]] : []));
const one = (n, d) => all(n)[0] ?? d;
const flag = (n) => args.includes(`--${n}`);

const builds = all("build").map((s) => {
	const [label, rest] = [s.slice(0, s.indexOf("=")), s.slice(s.indexOf("=") + 1)];
	const colon = rest.lastIndexOf(":");
	return { label, cli: rest.slice(0, colon), prefix: rest.slice(colon + 1) };
});
if (builds.length < 1) throw new Error("at least one --build label=cli.js:PREFIX is required");
const baseUrl = one("base-url");
const model = one("model");
if (!baseUrl || !model) throw new Error("--base-url and --model are required");
const keyEnv = one("api-key-env");
const apiKey = keyEnv ? (process.env[keyEnv] ?? "") : "none";
const runs = Number(one("runs", "1"));
const timeoutMs = Number(one("timeout-ms", "600000"));
const wanted = one("tasks")?.split(",");
const tasks = allTasks.filter((t) => !wanted || wanted.includes(t.id));
const out = one("out", "eval-results.json");
const thinking = one("thinking");
// A run whose provider answered with an error is not evidence about the build (gateway glitches, rate limits). It is
// repeated up to --retry-invalid times and, if it still errors, reported as invalid and left out of pass counts.
const transcripts = one("transcripts"); // directory: raw --mode json event stream of every attempt, for debugging
if (transcripts) mkdirSync(transcripts, { recursive: true });
const retryInvalid = Number(one("retry-invalid", "2"));

function runOnce(build, task, tag = "") {
	const home = mkdtempSync(join(tmpdir(), "eval-home-"));
	const agentDir = join(home, "agent");
	const project = join(home, "project");
	mkdirSync(agentDir, { recursive: true });
	for (const [f, c] of Object.entries(task.files)) {
		mkdirSync(dirname(join(project, f)), { recursive: true });
		writeFileSync(join(project, f), c);
	}
	writeFileSync(
		join(agentDir, "models.json"),
		JSON.stringify({ providers: { eval: { baseUrl, api: "openai-completions", apiKey, models: [{ id: model, reasoning: flag("reasoning"), contextWindow: 128000, maxTokens: Number(one("max-tokens", "8192")) }] } } }),
		{ mode: 0o600 },
	);
	const env = {
		PATH: process.env.PATH,
		HOME: home,
		TMPDIR: tmpdir(),
		[`${build.prefix}_CODING_AGENT_DIR`]: agentDir,
		[`${build.prefix}_OFFLINE`]: "1",
		[`${build.prefix}_SKIP_VERSION_CHECK`]: "1",
		[`${build.prefix}_TELEMETRY`]: "0",
	};
	const argv = [build.cli, "-p", "--provider", "eval", "--model", model, "--no-session", "--no-extensions", "--no-skills", "--no-mcp", "--mode", "json", ...(thinking ? ["--thinking", thinking] : []), task.prompt];
	const t0 = Date.now();
	return new Promise((resolve) => {
		const child = spawn(process.execPath, argv, { cwd: project, env, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => (stdout += d));
		child.stderr.on("data", (d) => (stderr += d));
		const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
		child.on("close", (code) => {
			clearTimeout(timer);
			if (transcripts) writeFileSync(join(transcripts, `${build.label}-${task.id}${tag}.jsonl`), stdout);
			const events = stdout.split("\n").flatMap((l) => {
				try {
					return [JSON.parse(l)];
				} catch {
					return [];
				}
			});
			const turns = events.filter((e) => e.type === "turn_end").length;
			const assistant = events.filter((e) => e.type === "message_end" && e.message?.role === "assistant");
			const sum = (k) => assistant.reduce((a, e) => a + (e.message.usage?.[k] ?? 0), 0);
			const toolCalls = events.filter((e) => e.type === "tool_execution_start").length;
			const toolErrors = events.filter((e) => e.type === "tool_execution_end" && e.isError).length;
			// Prompt tokens of the first request = system prompt + tool schemas + the task prompt.
			const firstTurnInputTokens = assistant[0]?.message.usage?.input ?? 0;
			const errors = assistant.filter((e) => e.message.stopReason === "error").map((e) => String(e.message.errorMessage ?? "error").slice(0, 200));
			let success = false;
			try {
				success = Boolean(task.check(project));
			} catch {}
			rmSync(home, { recursive: true, force: true });
			resolve({
				build: build.label,
				task: task.id,
				success,
				exitCode: code,
				turns,
				toolCalls,
				toolErrors,
				inputTokens: sum("input"),
				outputTokens: sum("output"),
				cacheReadTokens: sum("cacheRead"),
				wallMs: Date.now() - t0,
				firstTurnInputTokens,
				errors,
				stderrTail: code === 0 ? "" : stderr.slice(-300),
			});
		});
	});
}

const results = [];
const retried = [];
let order = 0;
for (let r = 0; r < runs; r++) {
	for (const task of tasks) {
		const ordered = order++ % 2 === 0 ? builds : [...builds].reverse();
		for (const build of ordered) {
			let res;
			let attempts = 0;
			do {
				res = await runOnce(build, task, `-r${r}-a${attempts + 1}`);
				attempts++;
				console.error(`[${build.label}] ${task.id} run ${r} attempt ${attempts}: ${res.success ? "PASS" : "FAIL"} turns=${res.turns} tools=${res.toolCalls} in=${res.inputTokens} out=${res.outputTokens} ${(res.wallMs / 1000).toFixed(0)}s${res.errors.length ? ` PROVIDER-ERROR ${res.errors[0].slice(0, 80)}` : ""}`);
				if (res.errors.length) retried.push({ build: build.label, task: task.id, run: r, attempt: attempts, errors: res.errors, turns: res.turns, success: res.success });
			} while (res.errors.length && attempts <= retryInvalid);
			res.run = r;
			res.attempts = attempts;
			res.invalid = res.errors.length > 0;
			results.push(res);
			writeFileSync(out, JSON.stringify({ baseUrl: baseUrl.replace(/\/\/[^/@]*@/, "//"), model, runs, results, retried }, null, 2));
		}
	}
}

const summary = {};
for (const b of builds) {
	const rs = results.filter((x) => x.build === b.label && !x.invalid);
	const n = rs.length;
	const avg = (k) => (n ? rs.reduce((a, x) => a + x[k], 0) / n : 0);
	summary[b.label] = { runs: n, invalid: results.filter((x) => x.build === b.label && x.invalid).length, providerErrorsRetried: retried.filter((x) => x.build === b.label).length, passed: rs.filter((x) => x.success).length, avgTurns: avg("turns"), avgToolCalls: avg("toolCalls"), avgInputTokens: Math.round(avg("inputTokens")), avgOutputTokens: Math.round(avg("outputTokens")), avgWallS: Math.round(avg("wallMs") / 100) / 10, firstTurnInputTokens: rs[0]?.firstTurnInputTokens ?? 0 };
}
console.log(JSON.stringify(summary, null, 2));
writeFileSync(out, JSON.stringify({ baseUrl, model, runs, summary, results, retried }, null, 2));
