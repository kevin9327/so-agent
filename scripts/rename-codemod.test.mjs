import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { expandLegacyAliasLines, transform } from "../rename/rename.mjs";

const codemod = join(dirname(fileURLToPath(import.meta.url)), "..", "rename", "rename.mjs");

test("transform renames the brand but not unrelated words", () => {
	assert.equal(transform("PI_OFFLINE pipe api pixel Math.PI .pi/skills"), "SO_OFFLINE pipe api pixel Math.PI .so/skills");
	assert.equal(transform('import "@earendil-works/pi-ai/compat"'), 'import "@so-agent/ai/compat"');
	// Third-party packages published under the same scope are not Pi packages and must keep their names.
	assert.equal(
		transform('import { VM } from "@earendil-works/gondolin"; "@earendil-works/gondolin-krun-runner-linux-x64"'),
		'import { VM } from "@earendil-works/gondolin"; "@earendil-works/gondolin-krun-runner-linux-x64"',
	);
	assert.equal(transform("see https://pi.dev/docs and earendil-works/pi"), "see https://pi.dev/docs and earendil-works/pi");
});

const LOADER = [
	'const piTuiEntry = resolveWorkspaceOrImport("tui/dist/index.js", "@earendil-works/pi-tui");',
	"const aliases = {",
	'\t"@earendil-works/pi-tui": piTuiEntry,',
	'\t"@mariozechner/pi-tui": piTuiEntry,',
	"};",
].join("\n");

test("alias tables keep resolving Pi's package names next to the renamed ones", () => {
	const file = "packages/coding-agent/src/core/extensions/loader.ts";
	const out = expandLegacyAliasLines(LOADER, transform(LOADER), file);
	const lines = out.split("\n");
	// The module actually imported is renamed; both Pi scopes stay as keys that point at the renamed entry.
	assert.ok(lines.includes('const soTuiEntry = resolveWorkspaceOrImport("tui/dist/index.js", "@so-agent/tui");'));
	assert.ok(lines.includes('\t"@so-agent/tui": soTuiEntry,'));
	assert.ok(lines.includes('\t"@earendil-works/pi-tui": soTuiEntry,'));
	assert.ok(lines.includes('\t"@mariozechner/pi-tui": soTuiEntry,'));
	// Running the expansion over its own output changes nothing.
	assert.equal(expandLegacyAliasLines(out, transform(out), file), out);
});

test("the codemod deletes nothing, disables upstream governance workflows by renaming them, and is idempotent", () => {
	const root = mkdtempSync(join(tmpdir(), "rename-codemod-"));
	try {
		const files = {
			".github/workflows/issue-gate.yml": "name: pi issue gate\n",
			".github/workflows/ci.yml": "name: pi ci\n",
			"scripts/issues/main.ts": "export const tool = 'pi';\n",
			"packages/coding-agent/src/core/extensions/loader.ts": LOADER,
			"LICENSE": "Copyright pi authors\n",
		};
		for (const [path, text] of Object.entries(files)) {
			mkdirSync(dirname(join(root, path)), { recursive: true });
			writeFileSync(join(root, path), text);
		}
		const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
		git("init", "-q");
		git("add", "-A");
		execFileSync(process.execPath, [codemod, "--root", root], { stdio: "ignore" });
		git("add", "-A");
		assert.equal(readFileSync(join(root, ".github/workflows/issue-gate.yml.disabled"), "utf8"), "name: so issue gate\n");
		assert.ok(!existsSync(join(root, ".github/workflows/issue-gate.yml")));
		assert.equal(readFileSync(join(root, ".github/workflows/ci.yml"), "utf8"), "name: so ci\n");
		assert.ok(existsSync(join(root, "scripts/issues/main.ts")));
		assert.equal(readFileSync(join(root, "LICENSE"), "utf8"), files.LICENSE);
		const once = git("ls-files", "-s") + readFileSync(join(root, "packages/coding-agent/src/core/extensions/loader.ts"), "utf8");
		execFileSync(process.execPath, [codemod, "--root", root], { stdio: "ignore" });
		git("add", "-A");
		const twice = git("ls-files", "-s") + readFileSync(join(root, "packages/coding-agent/src/core/extensions/loader.ts"), "utf8");
		assert.equal(twice, once);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
