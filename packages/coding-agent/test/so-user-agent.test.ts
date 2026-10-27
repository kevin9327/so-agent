import { describe, expect, it } from "vitest";
import { getSoUserAgent } from "../src/utils/so-user-agent.ts";

describe("getSoUserAgent", () => {
	it("formats the user agent expected by pi.dev", () => {
		const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
		const userAgent = getSoUserAgent("1.2.3");

		expect(userAgent).toBe(`so/1.2.3 (${process.platform}; ${runtime}; ${process.arch})`);
		expect(userAgent).toMatch(/^so\/[^\s()]+ \([^;()]+;\s*[^;()]+;\s*[^()]+\)$/);
	});
});
