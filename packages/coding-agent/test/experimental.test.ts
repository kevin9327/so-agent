import { afterEach, describe, expect, it } from "vitest";
import { areExperimentalFeaturesEnabled } from "../src/core/experimental.ts";

describe("areExperimentalFeaturesEnabled", () => {
	const originalSoExperimental = process.env.SO_EXPERIMENTAL;

	afterEach(() => {
		if (originalSoExperimental === undefined) {
			delete process.env.SO_EXPERIMENTAL;
		} else {
			process.env.SO_EXPERIMENTAL = originalSoExperimental;
		}
	});

	it("returns false when SO_EXPERIMENTAL is unset", () => {
		delete process.env.SO_EXPERIMENTAL;

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});

	it("returns false when SO_EXPERIMENTAL is empty", () => {
		process.env.SO_EXPERIMENTAL = "";

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});

	it("returns true when SO_EXPERIMENTAL is set to 1", () => {
		process.env.SO_EXPERIMENTAL = "1";

		expect(areExperimentalFeaturesEnabled()).toBe(true);
	});

	it("returns false when SO_EXPERIMENTAL is set to 0", () => {
		process.env.SO_EXPERIMENTAL = "0";

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});

	it("returns false when SO_EXPERIMENTAL is set to a non-1 value", () => {
		process.env.SO_EXPERIMENTAL = "true";

		expect(areExperimentalFeaturesEnabled()).toBe(false);
	});
});
