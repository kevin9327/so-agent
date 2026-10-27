import { compare, valid } from "semver";
import { PACKAGE_NAME } from "../config.ts";
import { fetchWithRetry } from "./management-http.ts";
import { getSoUserAgent } from "./so-user-agent.ts";

/**
 * Where the update check looks for the newest release. The upstream project's release feed would offer (and
 * `so update --self` would install) upstream Pi, so the default is the npm registry entry of this package. Until the package is
 * published the registry answers 404 and the check stays silent. `SO_UPDATE_URL` points at any other feed that
 * returns `{ version, packageName?, note? }` (the shape upstream's feed uses); the registry's `{ name, version }` works too.
 */
export function getLatestVersionUrl(env: NodeJS.ProcessEnv = process.env): string {
	return env.SO_UPDATE_URL?.trim() || `https://registry.npmjs.org/${PACKAGE_NAME.replace("/", "%2f")}/latest`;
}
const DEFAULT_VERSION_CHECK_TIMEOUT_MS = 10000;

export interface LatestSoRelease {
	version: string;
	packageName?: string;
	note?: string;
}

/** Include useful errno details hidden behind Node's generic "fetch failed" error. */
export function formatVersionCheckError(error: unknown): string {
	const rootMessage = error instanceof Error && error.message ? error.message : String(error);
	const cause = error instanceof Error ? error.cause : undefined;
	const causes = cause instanceof AggregateError ? cause.errors : cause === undefined ? [] : [cause];
	const codes = causes
		.map((value) =>
			typeof value === "object" && value !== null && "code" in value && typeof value.code === "string"
				? value.code
				: undefined,
		)
		.filter((code): code is string => code !== undefined);

	if (codes.length > 0) return `${rootMessage} (${[...new Set(codes)].join(", ")})`;
	const causeMessage = causes.find(
		(value): value is Error => value instanceof Error && Boolean(value.message),
	)?.message;
	return causeMessage ? `${rootMessage} (cause: ${causeMessage})` : rootMessage;
}

export function comparePackageVersions(leftVersion: string, rightVersion: string): number | undefined {
	const left = valid(leftVersion.trim());
	const right = valid(rightVersion.trim());
	if (!left || !right) {
		return undefined;
	}
	return compare(left, right);
}

export function isNewerPackageVersion(candidateVersion: string, currentVersion: string): boolean {
	const comparison = comparePackageVersions(candidateVersion, currentVersion);
	if (comparison !== undefined) {
		return comparison > 0;
	}
	return candidateVersion.trim() !== currentVersion.trim();
}

export async function getLatestSoRelease(
	currentVersion: string,
	options: { timeoutMs?: number; retry?: boolean } = {},
): Promise<LatestSoRelease | undefined> {
	if (process.env.SO_OFFLINE) return undefined;

	const response = await fetchWithRetry(
		getLatestVersionUrl(),
		{
			headers: {
				"User-Agent": getSoUserAgent(currentVersion),
				accept: "application/json",
			},
		},
		{
			maxRetries: options.retry ? 2 : 0,
			timeoutMs: options.timeoutMs ?? DEFAULT_VERSION_CHECK_TIMEOUT_MS,
		},
	);
	if (!response.ok) return undefined;

	const data = (await response.json()) as {
		name?: unknown;
		packageName?: unknown;
		version?: unknown;
		note?: unknown;
	};
	if (typeof data.version !== "string" || !data.version.trim()) {
		return undefined;
	}
	const feedPackageName = data.packageName ?? data.name;
	const packageName =
		typeof feedPackageName === "string" && feedPackageName.trim() ? feedPackageName.trim() : undefined;
	const note = typeof data.note === "string" && data.note.trim() ? data.note.trim() : undefined;
	return {
		version: data.version.trim(),
		packageName,
		...(note ? { note } : {}),
	};
}

export async function getLatestSoVersion(
	currentVersion: string,
	options: { timeoutMs?: number; retry?: boolean } = {},
): Promise<string | undefined> {
	return (await getLatestSoRelease(currentVersion, options))?.version;
}

export async function checkForNewSoVersion(currentVersion: string): Promise<LatestSoRelease | undefined> {
	if (process.env.SO_SKIP_VERSION_CHECK) return undefined;

	try {
		const latestRelease = await getLatestSoRelease(currentVersion);
		if (latestRelease && isNewerPackageVersion(latestRelease.version, currentVersion)) {
			return latestRelease;
		}
		return undefined;
	} catch {
		return undefined;
	}
}
