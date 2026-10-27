import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = join(root, "packages", "coding-agent", "dist", "bundle", "cli.js");
const built = existsSync(launcher);

// Preload that reports when the launcher loads the application graph.
const dir = mkdtempSync(join(tmpdir(), "so-launcher-"));
const preload = join(dir, "preload.cjs");
writeFileSync(
	preload,
	`const M = require("node:module"); const orig = M.prototype.require;
M.prototype.require = function (id) { if (String(id).endsWith("cli-runtime.js")) process.stderr.write("LOADED_RUNTIME\\n"); return orig.apply(this, arguments); };`,
);

function run(args) {
	return spawnSync(process.execPath, ["--require", preload, launcher, ...args], {
		encoding: "utf8",
		env: { ...process.env, SO_OFFLINE: "1", SO_CODING_AGENT_DIR: join(dir, "agent") },
	});
}

test("so --version and -v print the package version without loading the application", { skip: !built }, () => {
	const version = JSON.parse(readFileSync(join(root, "packages", "coding-agent", "package.json"), "utf8")).version;
	for (const flag of ["--version", "-v"]) {
		const result = run([flag]);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout.trim(), version);
		assert.ok(!result.stderr.includes("LOADED_RUNTIME"), `${flag} must not load the runtime`);
	}
});

test("other invocations still load the application", { skip: !built }, () => {
	const result = run(["--help"]);
	assert.equal(result.status, 0, result.stderr);
	assert.ok(result.stderr.includes("LOADED_RUNTIME"));
	assert.match(result.stdout, /Usage:/);
	// `--version` combined with other arguments takes the normal path
	assert.ok(run(["--version", "--offline"]).stderr.includes("LOADED_RUNTIME"));
});

test("the fast path prints exactly what the full path prints, and SO_PACKAGE_DIR forces the full path", { skip: !built }, () => {
	const fast = run(["--version"]);
	const packageDir = join(root, "packages", "coding-agent");
	const full = spawnSync(process.execPath, ["--require", preload, launcher, "--version"], {
		encoding: "utf8",
		env: { ...process.env, SO_OFFLINE: "1", SO_CODING_AGENT_DIR: join(dir, "agent"), SO_PACKAGE_DIR: packageDir },
	});
	assert.equal(full.status, 0, full.stderr);
	assert.ok(full.stderr.includes("LOADED_RUNTIME"));
	assert.equal(full.stdout, fast.stdout);
});

test("print mode never loads the interactive UI module graph", { skip: !built }, async () => {
	const { startMockServer } = await import("../bench/mock-server.mjs");
	const { spawn } = await import("node:child_process");
	const log = join(dir, "loaded.txt");
	writeFileSync(log, "");
	const hooks = join(dir, "hooks.cjs");
	writeFileSync(
		hooks,
		`const { registerHooks } = require("node:module"); const { appendFileSync } = require("node:fs");
registerHooks({ resolve(s, c, next) { const r = next(s, c); if (r.url.includes("/chunks/")) appendFileSync(${JSON.stringify(log)}, r.url + "\\n"); return r; } });`,
	);
	const agentDir = join(dir, "print-agent");
	const project = mkdtempSync(join(dir, "proj-"));
	const { server, port } = await startMockServer({ logFile: join(dir, "requests.jsonl"), toolOutputTurns: 0 });
	try {
		mkdirSync(agentDir, { recursive: true });
		writeFileSync(
			join(agentDir, "models.json"),
			JSON.stringify({
				providers: { mock: { baseUrl: `http://127.0.0.1:${port}/v1`, api: "openai-completions", apiKey: "k", models: [{ id: "m", contextWindow: 100000, maxTokens: 1000 }] } },
			}),
		);
		const child = spawn(process.execPath, ["--require", hooks, launcher, "-p", "--provider", "mock", "--model", "m", "--no-session", "--no-extensions", "hi"], {
			cwd: project,
			env: { ...process.env, SO_OFFLINE: "1", SO_CODING_AGENT_DIR: agentDir },
			stdio: ["ignore", "pipe", "pipe"],
		});
		let output = "";
		child.stdout.on("data", (c) => (output += c));
		child.stderr.on("data", (c) => (output += c));
		const code = await new Promise((resolveExit) => child.on("exit", resolveExit));
		assert.equal(code, 0, output);
		assert.match(output, /done/);
		const loaded = [...new Set(readFileSync(log, "utf8").split("\n").filter(Boolean))];
		assert.ok(loaded.length > 0, "the hook recorded no chunk loads");
		// The interactive mode is its own chunk (`interactive-mode-<hash>.js`), reached only through a dynamic import.
		const chunkDir = join(root, "packages", "coding-agent", "dist", "bundle", "chunks");
		assert.ok(readdirSync(chunkDir).some((name) => /^interactive-mode-.*\.js$/.test(name)), "no interactive mode chunk was built");
		const interactive = loaded.filter((url) => /\/interactive-mode-[^/]*\.js$/.test(url));
		assert.deepEqual(interactive, [], "print mode evaluated the interactive mode module");
	} finally {
		server.close();
	}
});
