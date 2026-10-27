import { describe, expect, it } from "vitest";
import { applyEditsToNormalizedContent, describeClosestRegion } from "../src/core/tools/edit-diff.ts";

const file = [
	"export function range(from, to) {",
	"  const out = [];",
	"  for (let i = from; i < to; i++) {",
	"    out.push(i);",
	"  }",
	"  return out;",
	"}",
	"",
	"export const unrelated = 1;",
].join("\n");

describe("edit not-found hint", () => {
	it("keeps the original message and shows the file's current lines when the first line matches", () => {
		const oldText =
			"export function range(from, to) {\n  const out = [];\n  for (let i = from; i < to; i++) out.push(i);\n  return out;\n}";
		let message = "";
		try {
			applyEditsToNormalizedContent(file, [{ oldText, newText: "x" }], "range.js");
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toMatch(
			/^Could not find the exact text in range\.js\. The old text must match exactly including all whitespace and newlines\./,
		);
		expect(message).toContain("The closest match in the file is at line 1.");
		expect(message).toContain("3|   for (let i = from; i < to; i++) {");
		expect(message).toContain("4|     out.push(i);");
	});

	it("finds a similar line when the model got the first line slightly wrong", () => {
		const hint = describeClosestRegion(file, "export function range(from, to){\n  return out;");
		expect(hint).toContain("at line 1");
		expect(hint).toContain("1| export function range(from, to) {");
	});

	it("says nothing when the file has nothing close, or oldText has no content", () => {
		expect(describeClosestRegion(file, "completely different words here")).toBe("");
		expect(describeClosestRegion(file, "  \n\n")).toBe("");
		expect(describeClosestRegion("", "anything")).toBe("");
	});

	it("bounds the snippet", () => {
		const long = Array.from({ length: 100 }, (_, i) => `line number ${i}`).join("\n");
		const hint = describeClosestRegion(long, `line number 10\n${Array.from({ length: 50 }, () => "x").join("\n")}`);
		expect(hint.split("\n").filter((l) => /^\s*\d+\|/.test(l))).toHaveLength(12);
	});

	it("uses the per-edit wording for multi-edit calls", () => {
		expect(() =>
			applyEditsToNormalizedContent(
				file,
				[
					{ oldText: "export const unrelated = 1;", newText: "y" },
					{ oldText: "export function range(from) {", newText: "z" },
				],
				"range.js",
			),
		).toThrow(/Could not find edits\[1\] in range\.js\..*closest match in the file is at line 1/s);
	});
});
