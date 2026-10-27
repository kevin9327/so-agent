import type { SettingsManager } from "./settings-manager.ts";

function isTruthyEnvFlag(value: string | undefined): boolean {
	if (!value) return false;
	return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

export function isInstallTelemetryEnabled(
	settingsManager: SettingsManager,
	telemetryEnv: string | undefined = process.env.SO_TELEMETRY,
): boolean {
	return telemetryEnv !== undefined ? isTruthyEnvFlag(telemetryEnv) : settingsManager.getEnableInstallTelemetry();
}

/**
 * URL of the anonymous install counter for `version`, or undefined when none is configured. There is no default
 * endpoint: the upstream project's counter would count so installs as Pi installs. Set `SO_INSTALL_REPORT_URL` to
 * your own counter to enable the report (it still obeys `enableInstallTelemetry` and `SO_TELEMETRY`).
 */
export function getInstallReportUrl(version: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
	const base = env.SO_INSTALL_REPORT_URL?.trim();
	if (!base) return undefined;
	return `${base}${base.includes("?") ? "&" : "?"}version=${encodeURIComponent(version)}`;
}
