import { describe, expect, test } from "vitest";
import { type ChangelogEntry, getNewEntries, normalizeChangelogLinks } from "../src/utils/changelog.ts";

const entry: ChangelogEntry = {
	major: 0,
	minor: 79,
	patch: 0,
	content: "",
};

describe("normalizeChangelogLinks", () => {
	test("rewrites package-relative changelog links to tag-pinned GitHub source links", () => {
		const markdown = [
			"[Project Trust](README.md#project-trust)",
			"[Extensions](docs/extensions.md#project_trust)",
			"[Examples](examples/extensions/)",
			"[Root README](../../README.md#supply-chain-hardening)",
		].join("\n");

		expect(normalizeChangelogLinks(markdown, entry)).toBe(
			[
				"[Project Trust](https://github.com/earendil-works/pi/blob/v0.79.0/packages/coding-agent/README.md#project-trust)",
				"[Extensions](https://github.com/earendil-works/pi/blob/v0.79.0/packages/coding-agent/docs/extensions.md#project_trust)",
				"[Examples](https://github.com/earendil-works/pi/tree/v0.79.0/packages/coding-agent/examples/extensions/)",
				"[Root README](https://github.com/earendil-works/pi/blob/v0.79.0/README.md#supply-chain-hardening)",
			].join("\n"),
		);
	});

	test("canonicalizes old repository URLs without changing external links", () => {
		const markdown = [
			"[#5167](https://github.com/earendil-works/pi-mono/pull/5167)",
			"[#4163](https://github.com/badlogic/pi-mono/issues/4163)",
			"[Agent README](https://github.com/badlogic/pi-mono/blob/main/packages/agent/README.md)",
			"[External](https://example.com/docs)",
			"[Local anchor](#settings)",
		].join("\n");

		expect(normalizeChangelogLinks(markdown, "0.79.0")).toBe(
			[
				"[#5167](https://github.com/earendil-works/pi/pull/5167)",
				"[#4163](https://github.com/earendil-works/pi/issues/4163)",
				"[Agent README](https://github.com/earendil-works/pi/blob/v0.79.0/packages/agent/README.md)",
				"[External](https://example.com/docs)",
				"[Local anchor](#settings)",
			].join("\n"),
		);
	});
});

describe("getNewEntries", () => {
	const at = (major: number, minor: number, patch: number): ChangelogEntry => ({
		major,
		minor,
		patch,
		content: `${major}.${minor}.${patch}`,
	});
	const entries = [at(1, 4, 0), at(0, 0, 3), at(0, 0, 2), at(0, 0, 1)];

	test("returns entries newer than the last seen version", () => {
		expect(getNewEntries(entries, "0.0.1").map((e) => e.content)).toEqual(["1.4.0", "0.0.3", "0.0.2"]);
	});

	test("leaves out entries newer than the running version, so upstream history is not announced", () => {
		expect(getNewEntries(entries, "0.0.1", "0.0.2").map((e) => e.content)).toEqual(["0.0.2"]);
		expect(getNewEntries(entries, "0.0.2", "0.0.2")).toEqual([]);
	});
});
