#!/usr/bin/env node
// Render a --mode json transcript (see run-eval.mjs --transcripts) as readable markdown.
//   node bench/eval/transcript-to-md.mjs transcript.jsonl "task prompt" > demo.md
import { readFileSync } from "node:fs";

const [file, prompt] = process.argv.slice(2);
if (!file) throw new Error("usage: transcript-to-md.mjs <transcript.jsonl> [prompt]");
const events = readFileSync(file, "utf8").split("\n").flatMap((l) => {
	try {
		return [JSON.parse(l)];
	} catch {
		return [];
	}
});
const out = [];
if (prompt) out.push(`**You:** ${prompt}`, "");
const text = (content) => content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
for (const e of events) {
	if (e.type === "message_end" && e.message?.role === "assistant") {
		const t = text(e.message.content);
		if (t) out.push(`**so:** ${t}`, "");
	}
	if (e.type === "tool_execution_start") {
		const args = e.args ?? {};
		const summary = e.toolName === "bash" ? args.command : e.toolName === "write" ? `${args.path} (${String(args.content ?? "").length} chars)` : e.toolName === "edit" ? args.path : (args.path ?? JSON.stringify(args));
		out.push(`\`${e.toolName}\` ${e.toolName === "bash" ? "`" + summary + "`" : summary}`, "");
	}
	if (e.type === "tool_execution_end") {
		const t = text(e.result?.content ?? []);
		out.push(`> ${e.isError ? "error: " : ""}${t.split("\n").slice(0, 6).join("\n> ").slice(0, 600)}`, "");
	}
}
process.stdout.write(`${out.join("\n").trim()}\n`);
