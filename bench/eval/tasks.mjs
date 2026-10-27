// Fixed coding tasks for the prompt evaluation. Each task: files to create, the prompt, and a check that runs in the
// task directory and returns true/false. Checks only look at the end state (files, test exit code), never at how the
// agent got there. Tasks are small on purpose so they work with small or rate-limited models.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const node = (cwd, ...args) => spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 20000 });
const read = (cwd, f) => (existsSync(join(cwd, f)) ? readFileSync(join(cwd, f), "utf8") : "");

export const tasks = [
	{
		id: "fix-off-by-one",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "range.js": "export function range(from, to) {\n  const out = [];\n  for (let i = from; i <= to; i++) out.push(i);\n  return out;\n}\n" },
		prompt: "The test in test.js fails. Fix the bug in range.js (do not edit test.js) and make `node test.js` pass.",
		files: {
			"range.js": "export function range(from, to) {\n  const out = [];\n  for (let i = from; i < to; i++) out.push(i);\n  return out;\n}\n",
			"test.js": 'import assert from "node:assert/strict";\nimport { range } from "./range.js";\nassert.deepEqual(range(1, 4), [1, 2, 3, 4]);\nassert.deepEqual(range(3, 3), [3]);\nconsole.log("ok");\n',
			"package.json": '{"type":"module"}\n',
		},
		check: (cwd) => node(cwd, "test.js").status === 0 && read(cwd, "test.js").includes("[1, 2, 3, 4]"),
	},
	{
		id: "add-function",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "util.js": "export function clamp(n, lo, hi) {\n  return Math.min(hi, Math.max(lo, n));\n}\nexport function slugify(t) {\n  return t.toLowerCase().trim().replace(/[^a-z0-9]+/g, \"-\").replace(/^-+|-+$/g, \"\");\n}\n" },
		prompt: "Add and export a function `slugify(text)` to util.js: lowercase, trim, replace each run of non-alphanumeric characters with a single `-`, and strip leading/trailing `-`. Example: slugify('  Hello, World!! ') === 'hello-world'.",
		files: { "util.js": "export function clamp(n, lo, hi) {\n  return Math.min(hi, Math.max(lo, n));\n}\n", "package.json": '{"type":"module"}\n' },
		check: (cwd) =>
			node(cwd, "--input-type=module", "-e", 'import {slugify,clamp} from "./util.js"; if (slugify("  Hello, World!! ")!=="hello-world"||slugify("a--b__c")!=="a-b-c"||slugify("---x---")!=="x"||clamp(5,0,3)!==3) process.exit(1)').status === 0,
	},
	{
		id: "rename-across-files",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "math.js": "export function computeTotal(items) {\n  return items.reduce((a, b) => a + b, 0);\n}\n", "report.js": "import { computeTotal } from \"./math.js\";\nexport function report(items) {\n  return computeTotal(items);\n}\n", "main.js": "import { report } from \"./report.js\";\nimport { computeTotal } from \"./math.js\";\nconsole.log(report([10, 20, 30]) === computeTotal([10, 20, 30]) ? computeTotal([10, 20, 30]) : \"mismatch\");\n" },
		prompt: "Rename the function `calcTotal` to `computeTotal` everywhere in this project (definition and all uses). Keep behavior the same; `node main.js` must still print 60.",
		files: {
			"math.js": "export function calcTotal(items) {\n  return items.reduce((a, b) => a + b, 0);\n}\n",
			"report.js": 'import { calcTotal } from "./math.js";\nexport function report(items) {\n  return calcTotal(items);\n}\n',
			"main.js": 'import { report } from "./report.js";\nimport { calcTotal } from "./math.js";\nconsole.log(report([10, 20, 30]) === calcTotal([10, 20, 30]) ? calcTotal([10, 20, 30]) : "mismatch");\n',
			"package.json": '{"type":"module"}\n',
		},
		check: (cwd) => {
			const all = ["math.js", "report.js", "main.js"].map((f) => read(cwd, f)).join("\n");
			const run = node(cwd, "main.js");
			return !all.includes("calcTotal") && all.includes("computeTotal") && run.status === 0 && run.stdout.trim() === "60";
		},
	},
	{
		id: "count-todos",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "answer.txt": "5\n" },
		prompt: "Count the lines containing the text `TODO` across all .js files under src/ (recursively). Write only the number to answer.txt.",
		files: {
			"src/a.js": "// TODO one\nexport const a = 1; // TODO two\n",
			"src/b.js": "export const b = 2;\n",
			"src/lib/c.js": "// TODO three\n// not a task\n// TODO four\n",
			"src/lib/notes.md": "TODO this is markdown and does not count\n",
			"src/lib/d.js": "// todo lowercase does not count\n// TODO five\n",
		},
		check: (cwd) => read(cwd, "answer.txt").trim() === "5",
	},
	{
		id: "create-config",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "config.json": "{\"name\":\"demo\",\"port\":8080,\"debug\":false,\"tags\":[\"a\",\"b\"]}" },
		prompt: 'Create config.json containing a JSON object with exactly these keys: "name" = "demo", "port" = 8080 (a number), "debug" = false, "tags" = ["a", "b"]. Valid JSON only.',
		files: { "README.md": "Project notes.\n" },
		check: (cwd) => {
			try {
				const c = JSON.parse(read(cwd, "config.json"));
				return JSON.stringify(Object.keys(c).sort()) === '["debug","name","port","tags"]' && c.name === "demo" && c.port === 8080 && c.debug === false && JSON.stringify(c.tags) === '["a","b"]';
			} catch {
				return false;
			}
		},
	},
	{
		id: "fix-empty-mean",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "stats.js": "export function mean(xs) {\n  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;\n}\nexport function max(xs) {\n  return Math.max(...xs);\n}\n" },
		prompt: "`node test.js` fails. Fix stats.js so mean([]) returns 0 and nothing else changes. Do not edit test.js.",
		files: {
			"stats.js": "export function mean(xs) {\n  return xs.reduce((a, b) => a + b, 0) / xs.length;\n}\nexport function max(xs) {\n  return Math.max(...xs);\n}\n",
			"test.js": 'import assert from "node:assert/strict";\nimport { mean, max } from "./stats.js";\nassert.equal(mean([2, 4, 6]), 4);\nassert.equal(mean([]), 0);\nassert.equal(max([1, 9, 3]), 9);\nconsole.log("ok");\n',
			"package.json": '{"type":"module"}\n',
		},
		check: (cwd) => node(cwd, "test.js").status === 0 && read(cwd, "test.js").includes("mean([]), 0"),
	},
];
