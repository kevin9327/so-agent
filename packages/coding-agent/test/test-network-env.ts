import { vi } from "vitest";

/** Enable network code paths for tests that replace external I/O with local fixtures or mocks. */
export function allowNetwork(): void {
	vi.stubEnv("SO_OFFLINE", undefined);
	// so has no hosted release feed; tests that exercise the update check mock this URL.
	vi.stubEnv("SO_UPDATE_URL", "https://pi.dev/api/latest-version");
}
