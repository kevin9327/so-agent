import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
