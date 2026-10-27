import { beforeEach, describe, expect, it, vi } from "vitest";
import { stream as streamOpenAICompletions } from "../src/api/openai-completions.ts";
import type { Model } from "../src/types.ts";
import { normalizeContext } from "../src/utils/transcript.ts";

const mockState = vi.hoisted(() => ({ chunks: [] as unknown[] }));

vi.mock("openai", () => {
	class FakeOpenAI {
		chat = {
			completions: {
				create: () => {
					const chunks = mockState.chunks;
					const stream = {
						async *[Symbol.asyncIterator]() {
							for (const chunk of chunks) yield chunk;
						},
					};
					const promise = Promise.resolve(stream) as Promise<typeof stream> & {
						withResponse: () => Promise<{ data: typeof stream; response: { status: number; headers: Headers } }>;
					};
					promise.withResponse = async () => ({ data: stream, response: { status: 200, headers: new Headers() } });
					return promise;
				},
			},
		};
	}
	return { default: FakeOpenAI };
});

const model: Model<"openai-completions"> = {
	id: "test-model",
	name: "Test Model",
	api: "openai-completions",
	provider: "openai",
	baseUrl: "https://api.openai.com/v1",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 128_000,
	maxTokens: 4096,
};

const context = normalizeContext({ messages: [{ role: "user", content: "hello", timestamp: Date.now() }] });
const chunk = (tool_calls: unknown[], finish_reason?: string) => ({
	id: "c",
	choices: [{ index: 0, delta: { tool_calls }, ...(finish_reason ? { finish_reason } : {}) }],
});

describe("OpenAI completions tool-call chunks without id and name", () => {
	beforeEach(() => {
		mockState.chunks = [];
	});

	it("continues the previous call instead of creating a nameless one", async () => {
		mockState.chunks = [
			chunk([{ index: 0, id: "call_1", type: "function", function: { name: "read", arguments: "" } }]),
			chunk([{ index: 0, function: { arguments: '{"path":"a.js","limit":' } }]),
			chunk([{ index: 1, function: { arguments: "200}" } }], "tool_calls"),
		];

		const message = await streamOpenAICompletions(model, context, { apiKey: "test" }).result();

		const calls = message.content.filter((block) => block.type === "toolCall");
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ id: "call_1", name: "read", arguments: { path: "a.js", limit: 200 } });
	});

	it("still treats a second call that has an id and a name as a separate call", async () => {
		mockState.chunks = [
			chunk([{ index: 0, id: "call_1", type: "function", function: { name: "read", arguments: '{"path":"a.js"}' } }]),
			chunk([{ index: 1, id: "call_2", type: "function", function: { name: "bash", arguments: '{"command":"ls"}' } }], "tool_calls"),
		];

		const message = await streamOpenAICompletions(model, context, { apiKey: "test" }).result();

		expect(message.content.filter((block) => block.type === "toolCall").map((block) => (block as { name: string }).name)).toEqual(["read", "bash"]);
	});

	it("keeps a bare first chunk as before when there is no previous call to continue", async () => {
		mockState.chunks = [chunk([{ index: 0, function: { arguments: '{"a":1}' } }], "tool_calls")];

		const message = await streamOpenAICompletions(model, context, { apiKey: "test" }).result();

		expect(message.content.filter((block) => block.type === "toolCall")).toHaveLength(1);
	});
});
