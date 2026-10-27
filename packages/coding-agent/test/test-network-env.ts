import { vi } from "vitest";

/** Enable network code paths for tests that replace external I/O with local fixtures or mocks. */
export function allowNetwork(): void {
	vi.stubEnv("SO_OFFLINE", undefined);
	// Tests that exercise the update check serve the upstream-shaped feed from this URL; the default is covered in version-check.test.ts.
	vi.stubEnv("SO_UPDATE_URL", "https://pi.dev/api/latest-version");
}
