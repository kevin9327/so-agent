import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkForNewSoVersion,
	comparePackageVersions,
	formatVersionCheckError,
	getLatestSoRelease,
	getLatestSoVersion,
	getLatestVersionUrl,
	isNewerPackageVersion,
} from "../src/utils/version-check.ts";
import { allowNetwork } from "./test-network-env.ts";

const originalSkipVersionCheck = process.env.SO_SKIP_VERSION_CHECK;

beforeEach(() => {
	allowNetwork();
});

afterEach(() => {
	vi.unstubAllGlobals();
	if (originalSkipVersionCheck === undefined) {
		delete process.env.SO_SKIP_VERSION_CHECK;
	} else {
		process.env.SO_SKIP_VERSION_CHECK = originalSkipVersionCheck;
	}
});

describe("version checks", () => {
	it("compares package versions", () => {
		expect(comparePackageVersions("0.70.6", "0.70.5")).toBeGreaterThan(0);
		expect(comparePackageVersions("0.70.5", "0.70.5")).toBe(0);
		expect(comparePackageVersions("0.70.4", "0.70.5")).toBeLessThan(0);
		expect(comparePackageVersions("5.0.0-beta.20", "5.0.0-beta.9")).toBeGreaterThan(0);
		expect(isNewerPackageVersion("0.70.5", "0.70.5")).toBe(false);
		expect(isNewerPackageVersion("0.70.6", "0.70.5")).toBe(true);
	});

	it("returns only newer versions", async () => {
		const fetchMock = vi.fn(async () => Response.json({ version: "1.2.3" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(checkForNewSoVersion("1.2.3")).resolves.toBeUndefined();
		await expect(checkForNewSoVersion("1.2.2")).resolves.toEqual({ version: "1.2.3" });
	});

	it("uses the pi.dev version check api with a so user agent", async () => {
		const fetchMock = vi.fn(async () => Response.json({ version: "1.2.4" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoVersion("1.2.3")).resolves.toBe("1.2.4");
		expect(fetchMock).toHaveBeenCalledWith(
			"https://pi.dev/api/latest-version",
			expect.objectContaining({
				headers: expect.objectContaining({
					"User-Agent": expect.stringMatching(/^so\/1\.2\.3 /),
					accept: "application/json",
				}),
			}),
		);
	});

	it("retries a transient version request when explicitly requested", async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error("fetch failed"))
			.mockRejectedValueOnce(new Error("fetch failed"))
			.mockResolvedValueOnce(Response.json({ version: "1.2.4" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoRelease("1.2.3", { retry: true })).resolves.toEqual({ version: "1.2.4" });
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("keeps automatic version checks to one request", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("fetch failed"));
		vi.stubGlobal("fetch", fetchMock);

		await expect(checkForNewSoVersion("1.2.3")).resolves.toBeUndefined();
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("formats nested network error details", () => {
		const error = new Error("fetch failed", {
			cause: new AggregateError([
				Object.assign(new Error("connect timeout"), { code: "ETIMEDOUT" }),
				Object.assign(new Error("network unreachable"), { code: "ENETUNREACH" }),
			]),
		});

		expect(formatVersionCheckError(error)).toBe("fetch failed (ETIMEDOUT, ENETUNREACH)");
	});

	it("returns the active package metadata from the version check api", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({
				packageName: "@new-scope/so",
				version: "1.2.4",
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoRelease("1.2.3")).resolves.toEqual({
			packageName: "@new-scope/so",
			version: "1.2.4",
		});
	});

	it("returns update notes from the version check api", async () => {
		const fetchMock = vi.fn(async () => Response.json({ note: " **Read this** ", version: "1.2.4" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoRelease("1.2.3")).resolves.toEqual({ note: "**Read this**", version: "1.2.4" });
	});

	it("skips automatic api calls when version checks are disabled", async () => {
		process.env.SO_SKIP_VERSION_CHECK = "1";
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await expect(checkForNewSoVersion("1.2.3")).resolves.toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("allows direct api calls when automatic version checks are disabled", async () => {
		process.env.SO_SKIP_VERSION_CHECK = "1";
		const fetchMock = vi.fn(async () => Response.json({ version: "1.2.4" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoVersion("1.2.3")).resolves.toBe("1.2.4");
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});

describe("the update feed", () => {
	it("defaults to the npm registry entry of this package, never to the upstream Pi feed", async () => {
		vi.stubEnv("SO_UPDATE_URL", "");
		expect(getLatestVersionUrl({})).toBe("https://registry.npmjs.org/@so-agent%2fcoding-agent/latest");
		const fetchMock = vi.fn(async () => Response.json({ name: "@so-agent/coding-agent", version: "1.0.1" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoRelease("1.0.0")).resolves.toEqual({
			version: "1.0.1",
			packageName: "@so-agent/coding-agent",
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"https://registry.npmjs.org/@so-agent%2fcoding-agent/latest",
			expect.anything(),
		);
	});

	it("stays silent while the package is not published", async () => {
		vi.stubEnv("SO_UPDATE_URL", "");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("{}", { status: 404 })),
		);
		await expect(checkForNewSoVersion("1.0.0")).resolves.toBeUndefined();
	});

	it("uses SO_UPDATE_URL and the upstream feed shape when set", async () => {
		vi.stubEnv("SO_UPDATE_URL", "https://updates.example.test/latest");
		const fetchMock = vi.fn(async () => Response.json({ version: "1.0.1", packageName: "@other/so", note: "hi" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestSoRelease("1.0.0")).resolves.toEqual({
			version: "1.0.1",
			packageName: "@other/so",
			note: "hi",
		});
		expect(fetchMock).toHaveBeenCalledWith("https://updates.example.test/latest", expect.anything());
	});

	it("makes no request with SO_OFFLINE or SO_SKIP_VERSION_CHECK", async () => {
		const fetchMock = vi.fn(async () => Response.json({ version: "9.9.9" }));
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("SO_OFFLINE", "1");
		await expect(checkForNewSoVersion("1.0.0")).resolves.toBeUndefined();
		vi.stubEnv("SO_OFFLINE", undefined);
		process.env.SO_SKIP_VERSION_CHECK = "1";
		await expect(checkForNewSoVersion("1.0.0")).resolves.toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
