import type { Provider } from "@so-agent/ai/compat";
import { describe, expect, it } from "vitest";
import { withRemoteCatalog } from "../src/core/remote-catalog-provider.ts";

const provider = { id: "test", getModels: () => [], getAllModels: () => [] } as unknown as Provider;

describe("remote model catalog", () => {
	it("is a no-op without a catalog URL, so so makes no catalog request by default", () => {
		expect(withRemoteCatalog(provider, undefined)).toBe(provider);
	});

	it("wraps the provider when a catalog URL is configured", () => {
		expect(withRemoteCatalog(provider, "https://catalog.example.test")).not.toBe(provider);
	});
});
