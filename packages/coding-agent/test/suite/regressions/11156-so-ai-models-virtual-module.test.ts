import { describe, expect, it } from "vitest";
import { VIRTUAL_MODULES } from "../../../src/core/extensions/virtual-modules.ts";

// Regression test for #11156: extensions importing @so-agent/ai/models
// (e.g. for clampThinkingLevel) failed with "Cannot find module" in embedded
// runtimes because the subpath was missing from the virtual module map.
describe("so-ai/models virtual module", () => {
	it("exposes the so-ai /models entrypoint to extensions", () => {
		const models = VIRTUAL_MODULES["@so-agent/ai/models"] as { clampThinkingLevel?: unknown } | undefined;
		expect(models).toBeDefined();
		expect(typeof models?.clampThinkingLevel).toBe("function");
	});

	it("exposes the same module under the legacy @so-agent scope", () => {
		expect(VIRTUAL_MODULES["@so-agent/ai/models"]).toBe(VIRTUAL_MODULES["@so-agent/ai/models"]);
	});
});
