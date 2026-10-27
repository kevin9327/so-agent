import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("coding-agent npm tarball leaves out sourcemaps and documentation screenshots", () => {
	const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
		cwd: join(root, "packages", "coding-agent"),
		encoding: "utf8",
		env: { ...process.env, npm_config_loglevel: "silent" },
	});
	const files = JSON.parse(out)[0].files.map((file) => file.path);
	assert.deepEqual(
		files.filter((path) => path.endsWith(".map")),
		[],
	);
	assert.deepEqual(
		files.filter((path) => path.startsWith("docs/images/")),
		[],
	);
	// still shipped: docs, examples, changelog, runtime assets
	assert.ok(files.includes("docs/quickstart.md"));
	assert.ok(files.includes("CHANGELOG.md"));
	assert.ok(files.some((path) => path.startsWith("examples/extensions/")));
});
