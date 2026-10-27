/**
 * Bash Spawn Hook Example
 *
 * Adjusts command, cwd, and env before execution.
 *
 * Usage:
 *   so -e ./bash-spawn-hook.ts
 */

import type { ExtensionAPI } from "@so-agent/coding-agent";
import { createBashTool } from "@so-agent/coding-agent";

export default function (so: ExtensionAPI) {
	const cwd = process.cwd();

	const bashTool = createBashTool(cwd, {
		spawnHook: ({ command, cwd, env }) => ({
			command: `source ~/.profile\n${command}`,
			cwd,
			env: { ...env, SO_SPAWN_HOOK: "1" },
		}),
	});

	so.registerTool({
		...bashTool,
		execute: async (id, params, signal, onUpdate, _ctx) => {
			return bashTool.execute(id, params, signal, onUpdate);
		},
	});
}
