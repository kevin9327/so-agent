import * as bundledSoAgentCore from "@so-agent/agent-core";
import * as bundledSoAiCompat from "@so-agent/ai/compat";
import * as bundledSoAiModels from "@so-agent/ai/models";
import * as bundledSoAiOauth from "@so-agent/ai/oauth";
import * as bundledSoAiProviders from "@so-agent/ai/providers/all";
import * as bundledSoTui from "@so-agent/tui";
import * as bundledTypebox from "typebox";
import * as bundledTypeboxCompile from "typebox/compile";
import * as bundledTypeboxValue from "typebox/value";
// This import is safe because loader.ts exports are not re-exported from index.ts.
// Extensions can therefore import from @so-agent/coding-agent.
import * as bundledSoCodingAgent from "../../index.ts";

/** Modules available to extensions in source and compiled binary runtimes. */
export const VIRTUAL_MODULES: Record<string, unknown> = {
	typebox: bundledTypebox,
	"typebox/compile": bundledTypeboxCompile,
	"typebox/value": bundledTypeboxValue,
	"@sinclair/typebox": bundledTypebox,
	"@sinclair/typebox/compile": bundledTypeboxCompile,
	"@sinclair/typebox/value": bundledTypeboxValue,
	"@so-agent/agent-core": bundledSoAgentCore,
	"@earendil-works/pi-agent-core": bundledSoAgentCore,
	"@so-agent/tui": bundledSoTui,
	"@earendil-works/pi-tui": bundledSoTui,
	// Extensions resolve the so-ai root to the compat entrypoint (a strict
	// superset of the core entrypoint): existing extensions using the old
	// global API keep working at runtime until compat is removed.
	"@so-agent/ai": bundledSoAiCompat,
	"@earendil-works/pi-ai": bundledSoAiCompat,
	"@so-agent/ai/compat": bundledSoAiCompat,
	"@earendil-works/pi-ai/compat": bundledSoAiCompat,
	"@so-agent/ai/models": bundledSoAiModels,
	"@earendil-works/pi-ai/models": bundledSoAiModels,
	"@so-agent/ai/oauth": bundledSoAiOauth,
	"@earendil-works/pi-ai/oauth": bundledSoAiOauth,
	"@so-agent/ai/providers/all": bundledSoAiProviders,
	"@earendil-works/pi-ai/providers/all": bundledSoAiProviders,
	"@so-agent/coding-agent": bundledSoCodingAgent,
	"@earendil-works/pi-coding-agent": bundledSoCodingAgent,
	"@mariozechner/pi-agent-core": bundledSoAgentCore,
	"@mariozechner/pi-tui": bundledSoTui,
	"@mariozechner/pi-ai": bundledSoAiCompat,
	"@mariozechner/pi-ai/compat": bundledSoAiCompat,
	"@mariozechner/pi-ai/models": bundledSoAiModels,
	"@mariozechner/pi-ai/oauth": bundledSoAiOauth,
	"@mariozechner/pi-ai/providers/all": bundledSoAiProviders,
	"@mariozechner/pi-coding-agent": bundledSoCodingAgent,
};
