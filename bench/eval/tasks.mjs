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
	{
		id: "create-fizzbuzz",
		// Reference solution, used by scripts/eval-tasks.test.mjs to prove the check passes only on a correct end state.
		solution: { "fizzbuzz.js": 'export function fizzbuzz(n) {\n  if (n % 15 === 0) return "FizzBuzz";\n  if (n % 3 === 0) return "Fizz";\n  if (n % 5 === 0) return "Buzz";\n  return String(n);\n}\n' },
		prompt: "Create fizzbuzz.js (ES module) exporting `fizzbuzz(n)`: returns 'FizzBuzz' for multiples of 15, 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, otherwise the number as a string.",
		files: { "package.json": '{"type":"module"}\n' },
		check: (cwd) =>
			node(cwd, "--input-type=module", "-e", 'import {fizzbuzz as f} from "./fizzbuzz.js"; const ok = f(15)==="FizzBuzz"&&f(9)==="Fizz"&&f(10)==="Buzz"&&f(7)==="7"&&f(30)==="FizzBuzz"; if(!ok) process.exit(1)').status === 0,
	},
	{
		id: "change-default-port",
		solution: { "config.js": "export const config = {\n  host: \"localhost\",\n  port: 8080,\n};\n", "README.md": "# App\n\nThe server listens on port 8080 by default.\n" },
		prompt: "Change the default server port from 3000 to 8080 in config.js and update the README so it states the new default. Change nothing else.",
		files: { "config.js": 'export const config = {\n  host: "localhost",\n  port: 3000,\n};\n', "README.md": "# App\n\nThe server listens on port 3000 by default.\n", "package.json": '{"type":"module"}\n' },
		check: (cwd) => read(cwd, "config.js").includes("port: 8080") && !read(cwd, "config.js").includes("3000") && read(cwd, "config.js").includes('host: "localhost"') && read(cwd, "README.md").includes("8080") && !read(cwd, "README.md").includes("3000"),
	},
	{
		id: "find-definition",
		solution: { "answer.txt": "src/time/parse.js\n" },
		prompt: "Which file defines the function `parseDate`? Write its path relative to the project root (for example `src/foo.js`) to answer.txt and nothing else.",
		files: {
			"src/index.js": 'import { parseDate } from "./time/parse.js";\nconsole.log(parseDate("2026-01-02"));\n',
			"src/time/parse.js": "export function parseDate(s) {\n  return new Date(s);\n}\n",
			"src/time/format.js": "export function formatDate(d) {\n  return d.toISOString();\n}\n",
			"src/util/strings.js": "export const pad = (s) => s.padStart(2, '0');\n",
		},
		check: (cwd) => read(cwd, "answer.txt").trim() === "src/time/parse.js",
	},
	{
		id: "edit-package-json",
		solution: { "package.json": JSON.stringify({ name: "demo", version: "1.3.0", scripts: { test: "node test.js", lint: "echo lint" }, license: "MIT" }, null, 2) + "\n" },
		prompt: 'In package.json change the version from 1.2.3 to 1.3.0 and add a script "lint" with the value "echo lint". Keep every other field.',
		files: { "package.json": JSON.stringify({ name: "demo", version: "1.2.3", scripts: { test: "node test.js" }, license: "MIT" }, null, 2) + "\n" },
		check: (cwd) => {
			try {
				const p = JSON.parse(read(cwd, "package.json"));
				return p.name === "demo" && p.version === "1.3.0" && p.license === "MIT" && p.scripts?.test === "node test.js" && p.scripts?.lint === "echo lint";
			} catch {
				return false;
			}
		},
	},
	{
		id: "count-errors-large-log",
		solution: { "answer.txt": "18\n" },
		prompt: "app.log is a large log file. Count the lines that contain the level ERROR (as a whole word, uppercase) and write only the number to answer.txt.",
		files: {
			"app.log": Array.from({ length: 3000 }, (_, i) => `2026-10-27T10:${String(Math.floor(i / 60) % 60).padStart(2, "0")}:${String(i % 60).padStart(2, "0")} ${i % 176 === 5 ? "ERROR" : i % 97 === 0 ? "WARN" : "INFO"} request ${i} handled${i % 500 === 7 ? " (no ERRORS here, just a word)" : ""}`).join("\n") + "\n",
		},
		check: (cwd) => read(cwd, "answer.txt").trim() === String(Array.from({ length: 3000 }, (_, i) => i).filter((i) => i % 176 === 5).length),
	},
];
