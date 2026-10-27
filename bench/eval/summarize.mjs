#!/usr/bin/env node
// Merge one or more run-eval result files and print a per-task table (passes / valid runs per build) plus totals.
// Runs whose provider answered with an error are listed as invalid and left out of the pass counts.
//   node bench/eval/summarize.mjs results-a.json results-b.json
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) throw new Error("usage: summarize.mjs <results.json>...");
const results = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).results ?? []);
const builds = [...new Set(results.map((r) => r.build))];
const taskIds = [...new Set(results.map((r) => r.task))];
const cell = (b, t) => {
	const rs = results.filter((r) => r.build === b && r.task === t);
	const valid = rs.filter((r) => !r.invalid);
	return { pass: valid.filter((r) => r.success).length, valid: valid.length, invalid: rs.length - valid.length };
};
const rows = taskIds.map((t) => [t, ...builds.map((b) => {
	const c = cell(b, t);
	return `${c.pass}/${c.valid}${c.invalid ? ` (+${c.invalid} invalid)` : ""}`;
})]);
const total = (b) => {
	const valid = results.filter((r) => r.build === b && !r.invalid);
	const sum = (k) => valid.reduce((a, r) => a + r[k], 0);
	return { pass: valid.filter((r) => r.success).length, valid: valid.length, turns: sum("turns"), tools: sum("toolCalls"), input: sum("inputTokens"), output: sum("outputTokens"), wallS: Math.round(sum("wallMs") / 1000) };
};
const lines = [["task", ...builds], ...rows, ["TOTAL pass/valid", ...builds.map((b) => `${total(b).pass}/${total(b).valid}`)]];
const width = lines[0].map((_, i) => Math.max(...lines.map((l) => String(l[i]).length)));
for (const l of lines) console.log(l.map((c, i) => String(c).padEnd(width[i])).join("  "));
console.log("");
for (const b of builds) console.log(b, JSON.stringify(total(b)));
