#!/usr/bin/env node
// Reproducible rename codemod: Pi (earendil-works/pi) -> so agent.
//
// Usage:  node rename/rename.mjs [--root <dir>] [--dry-run] [--report]
//
// Run it on a fresh checkout of upstream to regenerate the renamed tree.
// It rewrites text files in place, renames paths, and deletes upstream-only
// infrastructure. It is idempotent: a second run is a no-op.
//
// Attribution (LICENSE, ATTRIBUTION.md, upstream changelogs, upstream endpoint
// URLs, upstream issue links) is intentionally NOT renamed. See SKIP_* below.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const rootIdx = args.indexOf("--root");
const ROOT = resolve(rootIdx >= 0 ? args[rootIdx + 1] : join(dirname(new URL(import.meta.url).pathname), ".."));
const DRY = flag("--dry-run");

// Files whose content must keep upstream names (legal text, history, fixtures, the rename tooling itself).
const SKIP_CONTENT = [
	/^LICENSE$/,
	/^ATTRIBUTION\.md$/,
	/^NOTICE$/,
	/^rename\//,
	/(^|\/)CHANGELOG\.md$/, // upstream release history; kept verbatim
	/^packages\/mcp\/LICENSES\//,
	/\/test\/fixtures\//, // recorded upstream sessions
];

// Upstream catalog publishing tooling and the wire protocol of the pi.dev server keep their upstream identifiers
// (`piVersion`, `pi-version`, `pi/<ver>`): only npm scope/package names are rewritten there.
const SCOPE_ONLY = [/^scripts\/[^/]*model-catalog[^/]*$/, /^packages\/coding-agent\/test\/model-catalog-protocol\.test\.ts$/];

// Upstream-only infrastructure that is meaningless in a fork.
const REMOVE = [
	".github/APPROVED_CONTRIBUTORS",
	".github/ISSUE_TEMPLATE",
	".github/workflows/approve-contributor.yml",
	".github/workflows/issue-analysis.yml",
	".github/workflows/issue-gate.yml",
	".github/workflows/issue-triage-labels.yml",
	".github/workflows/pr-gate.yml",
	".github/workflows/remove-inprogress-on-close.yml",
	".github/workflows/publish-model-catalog.yml",
	".github/workflows/preview-packages.yml",
	"scripts/issues",
	"packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts",
];

// Legacy `@mariozechner/*` import aliases collapse into duplicates of the new `@so-agent/*` ones.
// After renaming, a line that came from a legacy alias is dropped when an identical line already exists.
const ALIAS_FILES = /(\/(loader|virtual-modules|resource-loader)\.ts|vitest\.[a-z.]*|vite\.config\.[a-z]+)$/;
function dedupeLegacyAliasLines(original, renamed, file) {
	if (!ALIAS_FILES.test(file) || !original.includes("@mariozechner")) return renamed;
	const origLines = original.split("\n");
	const newLines = renamed.split("\n");
	if (origLines.length !== newLines.length) return renamed;
	const seen = new Set();
	const nonLegacy = new Set(newLines.filter((_, i) => !origLines[i].includes("@mariozechner")).map((l) => l.trim()));
	return newLines
		.filter((l, i) => {
			if (!origLines[i].includes("@mariozechner")) return true;
			const key = l.trim();
			if (nonLegacy.has(key) || seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.join("\n");
}

// Text that must survive verbatim (upstream services, upstream issue refs, attribution).
const PROTECT = [
	// Upstream-hosted URLs and references (services, issues, blog posts, datasets) stay verbatim.
	/https?:\/\/(?:[A-Za-z0-9-]+\.)*(?:pi\.dev|earendil\.com|mariozechner\.at|huggingface\.co|x\.com)(?![A-Za-z0-9-])[^\s"'`)<>\]]*/g,
	/https?:\/\/(?:github\.com|raw\.githubusercontent\.com|api\.github\.com\/repos)\/(?:earendil-works|badlogic|badlogicgames)\/[^\s"'`)<>\]]*/g,
	/(?<![A-Za-z0-9.])(?:[a-z0-9-]+\.)?pi\.dev(?![A-Za-z0-9-])/g,
	/(?:github\.com\/|(?<![@A-Za-z0-9]))(?:earendil-works|badlogic|badlogicgames)\/pi(?:-mono)?(?![A-Za-z0-9-]|\.[a-z])/g,
	/(?:github\.com\/|(?<![@A-Za-z0-9]))(?:earendil-works|badlogic)\/pi\.git/g,
	/(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{60,}={0,2}(?![A-Za-z0-9+/])/g, // base64 / integrity hashes
	/\(\?:badlogic\|earendil-works\)\\\/pi-mono/g, // escaped form inside regex literals
	/\bpi-version\b/g, // query parameter of the upstream model catalog API
	/\bAI_AGENT\b/g,
];

// Ordered rules. Boundaries are "not alphanumeric" so `pi_x`, `x_pi`, `pi-ai`, `.pi` all match
// while `pipe`, `api`, `pixel`, `PING`, `Math.PI` (uppercase, no underscore) do not.
const RULES = [
	[/@earendil-works\\\/pi-/g, "@so-agent\\/"],
	[/@earendil-works\\\//g, "@so-agent\\/"],
	[/@earendil-works\/pi-/g, "@so-agent/"],
	[/@earendil-works\//g, "@so-agent/"],
	[/@(?:earendil-works|mariozechner)\+pi-/g, "@so-agent+"],
	// Scope and package name written as separate path segments: join(dir, "@earendil-works", "pi-ai"), "@scope\\\\pi-ai".
	[/(@(?:earendil-works|mariozechner)"\s*,\s*")pi-/g, '@so-agent", "'],
	[/@(?:earendil-works|mariozechner)\\\\pi-/g, "@so-agent\\\\"],
	[/@mariozechner\\\/pi-/g, "@so-agent\\/"],
	[/@mariozechner\/pi-/g, "@so-agent/"],
	[/@mariozechner\/pi(?![A-Za-z0-9-])/g, "@so-agent/so"],
	[/@mariozechner\//g, "@so-agent/"],
	[/@(?:earendil-works|mariozechner)(?![A-Za-z0-9-])/g, "@so-agent"],
	[/(?<![A-Za-z0-9])pi-monorepo(?![A-Za-z0-9])/g, "so-agent-monorepo"],
	[/(?<![A-Za-z0-9])pi-mono(?![A-Za-z0-9])/g, "so-agent"],
	[/(?<![A-Za-z0-9])PI_/g, "SO_"],
	[/(?<=_)PI(?=_|(?![A-Za-z0-9]))/g, "SO"],
	[/(?<![A-Za-z0-9.])PI(?![A-Za-z0-9])/g, "SO"],
	[/(?<![A-Za-z0-9])pi(?![A-Za-z0-9])/g, "so"],
	[/(?<![A-Za-z0-9])Pi(?![A-Za-z0-9])/g, "So"],
	[/(?<![A-Za-z0-9])pi(?=[A-Z])/g, "so"],
	[/(?<![A-Za-z0-9])Pi(?=[A-Z])/g, "So"],
	[/(?<=[a-z0-9])Pi(?=[A-Z]|(?![A-Za-z0-9]))/g, "So"],
];

const SCOPE_RULE_COUNT = RULES.findIndex(([re]) => re.source.includes("pi-monorepo")); // the leading `@scope/...` rules

export function transform(text, scopeOnly = false) {
	const saved = [];
	let out = text;
	for (const re of PROTECT) {
		out = out.replace(re, (m) => {
			saved.push(m);
			return `\u0000${saved.length - 1}\u0000`;
		});
	}
	for (const [re, to] of scopeOnly ? RULES.slice(0, SCOPE_RULE_COUNT) : RULES) out = out.replace(re, to);
	return out.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)]);
}

// Path components: rename only components that contain the brand as a word segment.
function transformPath(p) {
	return p
		.split("/")
		.map((c) => (c === ".git" || c === "node_modules" ? c : transform(c)))
		.join("/");
}

function isBinary(buf) {
	const n = Math.min(buf.length, 8000);
	for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
	return false;
}

const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
	.split("\0")
	.filter(Boolean);

let removed = 0;
const removedSet = new Set();
for (const r of REMOVE) {
	const abs = join(ROOT, r);
	if (existsSync(abs)) {
		if (!DRY) rmSync(abs, { recursive: true, force: true });
		removed++;
		removedSet.add(r);
	}
}
const isRemoved = (f) => [...removedSet].some((r) => f === r || f.startsWith(`${r}/`));

let contentChanged = 0;
let pathsRenamed = 0;
const renames = [];
for (const f of files) {
	if (isRemoved(f)) continue;
	const abs = join(ROOT, f);
	if (!existsSync(abs)) continue;
	if (!SKIP_CONTENT.some((re) => re.test(f))) {
		const buf = readFileSync(abs);
		if (!isBinary(buf)) {
			let text = buf.toString("utf8");
			const next = dedupeLegacyAliasLines(text, transform(text, SCOPE_ONLY.some((re) => re.test(f))), f);
			if (next !== buf.toString("utf8")) {
				contentChanged++;
				if (!DRY) writeFileSync(abs, next);
			}
		}
	}
	const newPath = transformPath(f);
	if (newPath !== f) renames.push([f, newPath]);
}
for (const [from, to] of renames) {
	if (DRY) continue;
	mkdirSync(dirname(join(ROOT, to)), { recursive: true });
	renameSync(join(ROOT, from), join(ROOT, to));
	pathsRenamed++;
}
if (!DRY) {
	// Remove directories emptied by the path renames (e.g. `.pi/`).
	for (const [from] of renames) {
		let d = dirname(join(ROOT, from));
		while (d !== ROOT && existsSync(d) && statSync(d).isDirectory()) {
			try {
				rmSync(d); // only succeeds on empty dirs
			} catch {
				break;
			}
			d = dirname(d);
		}
	}
}
console.log(JSON.stringify({ root: ROOT, dryRun: DRY, filesRemoved: removed, filesContentChanged: contentChanged, pathsRenamed: DRY ? renames.length : pathsRenamed }, null, 2));
