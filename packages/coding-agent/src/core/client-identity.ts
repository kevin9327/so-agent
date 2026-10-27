import { type ClientIdentity, SO_ATTRIBUTION } from "@so-agent/ai";
import { VERSION } from "../config.ts";
import type { SettingsManager } from "./settings-manager.ts";
import { isInstallTelemetryEnabled } from "./telemetry.ts";

/**
 * How so's requests identify it to providers: a detailed `User-Agent` with so's version, and attribution to so as a
 * CLI agent while install telemetry is enabled.
 */
export function getClientIdentity(settingsManager: SettingsManager): ClientIdentity {
	return {
		userAgent: "detailed",
		version: VERSION,
		attribution: isInstallTelemetryEnabled(settingsManager) ? SO_ATTRIBUTION : null,
	};
}
