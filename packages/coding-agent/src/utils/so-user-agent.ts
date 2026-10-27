import { formatUserAgent } from "@so-agent/ai";

/** so's `User-Agent` for its own network requests; the same detailed form so-ai sends to providers. */
export function getSoUserAgent(version: string): string {
	return formatUserAgent({ userAgent: "detailed", version });
}
