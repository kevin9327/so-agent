/**
 * Extensions Configuration
 *
 * Extensions intercept agent events and can register custom tools.
 * They provide a unified system for extensions, custom tools, commands, and more.
 *
 * By default, extension files are discovered from:
 * - ~/.so/agent/extensions/
 * - <cwd>/.so/extensions/
 * - Paths specified in settings.json "extensions" array
 *
 * An extension is a TypeScript file that exports a default function:
 *   export default function (so: ExtensionAPI) { ... }
 */

import { createAgentSession, DefaultResourceLoader, getAgentDir, SessionManager } from "@so-agent/coding-agent";

// Extensions are discovered automatically from standard locations.
// You can also add paths via settings.json or DefaultResourceLoader options.

const resourceLoader = new DefaultResourceLoader({
	cwd: process.cwd(),
	agentDir: getAgentDir(),
	additionalExtensionPaths: ["./my-logging-extension.ts", "./my-safety-extension.ts"],
	extensionFactories: [
		(so) => {
			so.on("agent_start", () => {
				console.log("[Inline Extension] Agent starting");
			});
		},
	],
});
await resourceLoader.reload();

const { session } = await createAgentSession({
	resourceLoader,
	sessionManager: SessionManager.inMemory(),
});

try {
	session.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
			process.stdout.write(event.assistantMessageEvent.delta);
		}
	});

	await session.prompt("List files in the current directory.");
	console.log();
} finally {
	session.dispose();
}

// Example extension file (./my-logging-extension.ts):
/*
import type { ExtensionAPI } from "@so-agent/coding-agent";

export default function (so: ExtensionAPI) {
	so.on("agent_start", async () => {
		console.log("[Extension] Agent starting");
	});

	so.on("tool_call", async (event) => {
		console.log(\`[Extension] Tool: \${event.toolName}\`);
		// Return { block: true, reason: "..." } to block execution
		return undefined;
	});

	so.on("agent_end", async (event) => {
		console.log(\`[Extension] Low-level run ended, \${event.messages.length} messages\`);
	});

	// Register a custom tool
	so.registerTool({
		name: "my_tool",
		label: "My Tool",
		description: "Does something useful",
		parameters: Type.Object({
			input: Type.String(),
		}),
		execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => ({
			content: [{ type: "text", text: \`Processed: \${params.input}\` }],
			details: {},
		}),
	});

	// Register a command
	so.registerCommand("mycommand", {
		description: "Do something",
		handler: async (args, ctx) => {
			ctx.ui.notify(\`Command executed with: \${args}\`);
		},
	});
}
*/
