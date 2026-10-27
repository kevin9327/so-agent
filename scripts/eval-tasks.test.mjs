import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { tasks } from "../bench/eval/tasks.mjs";

function setup(files) {
	const dir = mkdtempSync(join(tmpdir(), "eval-task-"));
	for (const [f, c] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, f)), { recursive: true });
		writeFileSync(join(dir, f), c);
	}
	return dir;
}

for (const task of tasks) {
	test(`eval task ${task.id}: check fails on the starting state and passes on the reference solution`, () => {
		const dir = setup(task.files);
		try {
			assert.equal(Boolean(task.check(dir)), false, "starting state must not pass");
			for (const [f, c] of Object.entries(task.solution)) {
				mkdirSync(dirname(join(dir, f)), { recursive: true });
				writeFileSync(join(dir, f), c);
			}
			assert.equal(Boolean(task.check(dir)), true, "reference solution must pass");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
}

test("eval task ids are unique", () => {
	assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
});
