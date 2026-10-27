#!/usr/bin/env node
// Benchmark one build of the CLI against the local mock provider.
//   node bench/run.mjs --cli <path/to/cli.js> --prefix SO|PI [--runs 15] [--json out.json] [--label name]
// Measures: wall time to the first provider request (cold start to first byte on the wire), total print-mode run,
// peak RSS of the process tree, request payload size per turn (system prompt, tool schema, messages).
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startMockServer } from "./mock-server.mjs";

const cpuPreload = fileURLToPath(new URL("./cpu-preload.mjs", import.meta.url));

const arg = (n, d) => {
	const i = process.argv.indexOf(`--${n}`);
	return i >= 0 ? process.argv[i + 1] : d;
};
const cli = arg("cli");
const prefix = arg("prefix", "SO");
const runs = Number(arg("runs", "15"));
const label = arg("label", prefix);

const home = mkdtempSync(join(tmpdir(), "bench-home-"));
const agentDir = join(home, "agent");
const project = mkdtempSync(join(tmpdir(), "bench-proj-"));
mkdirSync(agentDir, { recursive: true });
writeFileSync(join(project, "package.json"), JSON.stringify({ name: "bench", version: "1.0.0", description: "x".repeat(200) }, null, 2));

const logFile = join(home, "requests.jsonl");
const { server, port } = await startMockServer({ logFile });
writeFileSync(
	join(agentDir, "models.json"),
	JSON.stringify({
		providers: { mock: { baseUrl: `http://127.0.0.1:${port}/v1`, api: "openai-completions", apiKey: "k", models: [{ id: "m", contextWindow: 200000, maxTokens: 4096 }] } },
	}),
);

function median(a) {
	const s = [...a].sort((x, y) => x - y);
	return s[Math.floor(s.length / 2)];
}
function readRss(pid) {
	try {
		const m = /VmHWM:\s+(\d+) kB/.exec(readFileSync(`/proc/${pid}/status`, "utf8"));
		return m ? Number(m[1]) / 1024 : 0;
	} catch {
		return 0;
	}
}

async function once() {
	writeFileSync(logFile, "");
	// reset turn counter by restarting the server state: a fresh server per run is simplest
	const srv = await startMockServer({ logFile });
	writeFileSync(
		join(agentDir, "models.json"),
		JSON.stringify({ providers: { mock: { baseUrl: `http://127.0.0.1:${srv.port}/v1`, api: "openai-completions", apiKey: "k", models: [{ id: "m", contextWindow: 200000, maxTokens: 4096 }] } } }),
	);
	const env = {
		PATH: process.env.PATH,
		HOME: home,
		TMPDIR: tmpdir(),
		[`${prefix}_CODING_AGENT_DIR`]: agentDir,
		[`${prefix}_OFFLINE`]: "1",
		[`${prefix}_SKIP_VERSION_CHECK`]: "1",
		[`${prefix}_TELEMETRY`]: "0",
		BENCH_CPU_FILE: join(home, "cpu.txt"),
		...JSON.parse(process.env.BENCH_EXTRA_ENV ?? "{}"),
	};
	writeFileSync(env.BENCH_CPU_FILE, "");
	const t0 = performance.now();
	const child = spawn(process.execPath, ["--import", cpuPreload, ...(process.env.BENCH_NODE_ARGS ?? "").split(" ").filter(Boolean), cli, "-p", "--provider", "mock", "--model", "m", "--no-session", "--no-extensions", "run the commands", "--mode", "text"], { cwd: project, env, stdio: ["ignore", "pipe", "pipe"] });
	let peak = 0;
	const poll = setInterval(() => (peak = Math.max(peak, readRss(child.pid))), 20);
	let firstReq;
	const watch = setInterval(() => {
		if (firstReq === undefined) {
			try {
				const l = readFileSync(logFile, "utf8").split("\n").filter(Boolean);
				if (l.length) firstReq = performance.now() - t0;
			} catch {}
		}
	}, 2);
	let out = "";
	child.stdout.on("data", (c) => (out += c));
	child.stderr.on("data", (c) => (out += c));
	const code = await new Promise((r) => child.on("exit", r));
	clearInterval(poll);
	clearInterval(watch);
	const total = performance.now() - t0;
	srv.server.close();
	const reqs = readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
	const cpu = readFileSync(env.BENCH_CPU_FILE, "utf8").split("\n").filter(Boolean).map(Number).reduce((a, b) => a + b, 0);
	return { code, out, firstReq, total, peak, reqs, cpu };
}

server.close();
const results = [];
await once(); // warmup (page cache)
for (let i = 0; i < runs; i++) results.push(await once());
const ok = results.filter((r) => r.code === 0 && r.reqs.length >= 3);
if (ok.length === 0) {
	console.error("no successful runs", results[0]?.code, results[0]?.out.slice(0, 2000));
	process.exit(1);
}
const first = ok[0].reqs;
const turn = (r) => {
	const b = r.body;
	const sys = (b.messages.find((m) => m.role === "system" || m.role === "developer")?.content) ?? "";
	const sysText = typeof sys === "string" ? sys : JSON.stringify(sys);
	return {
		requestBytes: r.bytes,
		systemPromptChars: sysText.length,
		toolSchemaChars: JSON.stringify(b.tools ?? []).length,
		toolCount: (b.tools ?? []).length,
		messageChars: JSON.stringify(b.messages.filter((m) => m.role !== "system" && m.role !== "developer")).length,
	};
};
// Prompt-cache friendliness: every request must start with the previous request's tools, system prompt and messages,
// byte for byte, so providers can reuse the cached prefix. Reports the first turn that breaks the prefix, or null.
function firstPrefixBreak(reqs) {
	for (let i = 1; i < reqs.length; i++) {
		const prev = reqs[i - 1].body;
		const cur = reqs[i].body;
		const strip = (b) => JSON.stringify({ ...b, messages: undefined, stream_options: undefined });
		if (strip(prev) !== strip(cur)) return { turn: i + 1, why: "request parameters or tools changed" };
		for (let m = 0; m < prev.messages.length; m++) {
			if (JSON.stringify(prev.messages[m]) !== JSON.stringify(cur.messages[m])) return { turn: i + 1, why: `message ${m} changed` };
		}
	}
	return null;
}
if (process.env.BENCH_SHOW_OUTPUT) console.error(ok[0].out);
const summary = {
	label,
	runs: ok.length,
	firstRequestMs: { median: Math.round(median(ok.map((r) => r.firstReq))), min: Math.round(Math.min(...ok.map((r) => r.firstReq))) },
	totalMs: { median: Math.round(median(ok.map((r) => r.total))) },
	cpuMs: { median: Math.round(median(ok.map((r) => r.cpu))) },
	peakRssMiB: Math.round(median(ok.map((r) => r.peak))),
	turns: first.map(turn),
	promptPrefixBreak: firstPrefixBreak(first),
};
console.log(JSON.stringify(summary, null, 2));
const jf = arg("json");
if (jf) {
	writeFileSync(jf, JSON.stringify(summary, null, 2));
	writeFileSync(jf.replace(/\.json$/, ".request1.json"), JSON.stringify(first[0].body, null, 2));
	writeFileSync(jf.replace(/\.json$/, ".request3.json"), JSON.stringify(first[2].body, null, 2));
}
