import type { Provider } from "@so-agent/ai/compat";
import { describe, expect, it } from "vitest";
import { getCatalogBaseUrl, withRemoteCatalog } from "../src/core/remote-catalog-provider.ts";
import { getInstallReportUrl } from "../src/core/telemetry.ts";
import { getManagedInstallerCommand } from "../src/package-manager-cli.ts";

const provider = { id: "test", getModels: () => [], getAllModels: () => [] } as unknown as Provider;

describe("remote model catalog", () => {
	it("is on by default and can be pointed elsewhere or switched off", () => {
		expect(getCatalogBaseUrl({})).toBe("https://pi.dev");
		expect(getCatalogBaseUrl({ SO_CATALOG_URL: "https://catalog.example.test" })).toBe(
			"https://catalog.example.test",
		);
		for (const off of ["off", "OFF", "0", "false", "none"])
			expect(getCatalogBaseUrl({ SO_CATALOG_URL: off })).toBe("");
	});

	it("wraps the provider unless the catalog is switched off", () => {
		expect(withRemoteCatalog(provider, "https://catalog.example.test")).not.toBe(provider);
		expect(withRemoteCatalog(provider, "")).toBe(provider);
	});
});

describe("install report", () => {
	it("has no default endpoint, so nothing is sent unless one is configured", () => {
		expect(getInstallReportUrl("1.2.3", {})).toBeUndefined();
		expect(getInstallReportUrl("1.2.3", { SO_INSTALL_REPORT_URL: " " })).toBeUndefined();
		expect(getInstallReportUrl("1.2.3", { SO_INSTALL_REPORT_URL: "https://count.example.test/in" })).toBe(
			"https://count.example.test/in?version=1.2.3",
		);
		expect(getInstallReportUrl("1.2.3-beta+x", { SO_INSTALL_REPORT_URL: "https://count.example.test/in?k=1" })).toBe(
			"https://count.example.test/in?k=1&version=1.2.3-beta%2Bx",
		);
	});
});

describe("managed installer hint", () => {
	it("never points at the upstream installer", () => {
		expect(getManagedInstallerCommand("linux", {})).toBeUndefined();
		expect(getManagedInstallerCommand("win32", {})).toBeUndefined();
		expect(getManagedInstallerCommand("linux", { SO_INSTALLER_URL: "https://so.example.test/install.sh" })).toBe(
			"curl -fsSL https://so.example.test/install.sh | sh",
		);
		expect(getManagedInstallerCommand("win32", { SO_INSTALLER_PS1_URL: "https://so.example.test/install.ps1" })).toBe(
			'powershell -c "irm https://so.example.test/install.ps1 | iex"',
		);
	});
});
