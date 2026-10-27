// Minimal OpenAI-compatible chat-completions server that records every request body.
// Turn 1 answers with a `bash` tool call, turn 2 with `read`, turn 3 with plain text.
import { appendFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

export function startMockServer({ logFile, port = 0, toolOutputTurns = 2 }) {
	writeFileSync(logFile, "");
	let turn = 0;
	const server = createServer((req, res) => {
		let body = "";
		req.on("data", (c) => (body += c));
		req.on("end", () => {
			if (req.method !== "POST" || !req.url.includes("/chat/completions")) {
				res.writeHead(404).end();
				return;
			}
			appendFileSync(logFile, `${JSON.stringify({ t: Date.now(), url: req.url, bytes: Buffer.byteLength(body), body: JSON.parse(body) })}\n`);
			turn++;
			res.writeHead(200, { "content-type": "text/event-stream" });
			const send = (delta, finish) =>
				res.write(`data: ${JSON.stringify({ id: "x", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta, finish_reason: finish ?? null }] })}\n\n`);
			if (turn <= toolOutputTurns) {
				const call =
					turn === 1
						? { name: "bash", arguments: JSON.stringify({ command: "seq 1 4000" }) }
						: { name: "read", arguments: JSON.stringify({ path: "package.json" }) };
				send({ role: "assistant", tool_calls: [{ index: 0, id: `call_${turn}`, type: "function", function: call }] });
				send({}, "tool_calls");
			} else {
				send({ role: "assistant", content: "done" });
				send({}, "stop");
			}
			res.write(`data: ${JSON.stringify({ id: "x", object: "chat.completion.chunk", created: 1, model: "m", choices: [], usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 } })}\n\n`);
			res.write("data: [DONE]\n\n");
			res.end();
		});
	});
	return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}
