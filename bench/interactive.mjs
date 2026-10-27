#!/usr/bin/env node
// Time the interactive TUI start: first output byte, and the moment the screen settles (no output for 300 ms).
//   node bench/interactive.mjs --cli <cli.js> --prefix SO|PI [--runs 9]
// A pseudo terminal is provided by util-linux `script`; the child is killed once the screen has settled.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, d) => {
	const i = process.argv.indexOf(`--${n}`);
	return i >= 0 ? process.argv[i + 1] : d;
};
const cli = arg("cli");
const prefix = arg("prefix", "SO");
const runs = Number(arg("runs", "9"));
const home = mkdtempSync(join(tmpdir(), "ibench-home-"));
const agentDir = join(home, "agent");
const project = mkdtempSync(join(tmpdir(), "ibench-proj-"));
mkdirSync(agentDir, { recursive: true });
writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ quietStartup: false }));

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function once() {
	const env = {
		PATH: process.env.PATH,
		HOME: home,
		TERM: "xterm-256color",
		COLUMNS: "100",
		LINES: "30",
		[`${prefix}_CODING_AGENT_DIR`]: agentDir,
		[`${prefix}_OFFLINE`]: "1",
		[`${prefix}_SKIP_VERSION_CHECK`]: "1",
		[`${prefix}_TELEMETRY`]: "0",
	};
	const t0 = performance.now();
	const child = spawn("script", ["-qefc", `${process.execPath} ${process.env.BENCH_NODE_ARGS ?? ""} ${cli} --no-extensions --no-session`, "/dev/null"], { cwd: project, env, stdio: ["pipe", "pipe", "pipe"] });
	let first;
	let last = 0;
	let bytes = 0;
	child.stdout.on("data", (c) => {
		const now = performance.now() - t0;
		first ??= now;
		last = now;
		bytes += c.length;
	});
	await new Promise((resolve) => {
		const tick = setInterval(() => {
			if (last > 0 && performance.now() - t0 - last > 300) {
				clearInterval(tick);
				resolve();
			}
			if (performance.now() - t0 > 8000) {
				clearInterval(tick);
				resolve();
			}
		}, 20);
	});
	child.kill("SIGKILL");
	await new Promise((r) => child.on("exit", r));
	return { first, settled: last, bytes };
}

await once();
const rs = [];
for (let i = 0; i < runs; i++) rs.push(await once());
console.log(JSON.stringify({ label: arg("label", prefix), runs, firstByteMs: Math.round(median(rs.map((r) => r.first))), settledMs: Math.round(median(rs.map((r) => r.settled))), bytes: rs[0].bytes }, null, 2));
