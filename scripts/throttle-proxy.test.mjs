import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { fileURLToPath } from "node:url";

const proxyScript = fileURLToPath(new URL("../bench/eval/throttle-proxy.mjs", import.meta.url));

test("throttle proxy spaces calls, waits out a rate-limit answer and forwards the body unchanged", async () => {
	const seen = [];
	let calls = 0;
	const upstream = createServer((req, res) => {
		let body = "";
		req.on("data", (c) => (body += c));
		req.on("end", () => {
			calls++;
			seen.push({ at: Date.now(), url: req.url, body, ua: req.headers["user-agent"] });
			if (calls === 1) {
				res.writeHead(402, { "content-type": "application/json" }).end('{"error":{"message":"Free limit reached. Retry after 1s"}}');
				return;
			}
			res.writeHead(200, { "content-type": "text/event-stream" }).end("data: [DONE]\n\n");
		});
	});
	upstream.listen(0, "127.0.0.1");
	await once(upstream, "listening");
	const upstreamPort = upstream.address().port;

	const proxyPort = 20000 + Math.floor(Math.random() * 20000);
	const proxy = spawn(process.execPath, [proxyScript, "--upstream", `http://127.0.0.1:${upstreamPort}/openai`, "--port", String(proxyPort), "--min-interval-ms", "300"], { stdio: ["ignore", "ignore", "pipe"] });
	try {
		for await (const chunk of proxy.stderr) if (String(chunk).includes("one call per")) break;
		const payload = JSON.stringify({ model: "m", messages: [{ role: "user", content: "hi" }] });
		const res = await fetch(`http://127.0.0.1:${proxyPort}/v1/chat/completions`, { method: "POST", body: payload, headers: { "content-type": "application/json" } });
		assert.equal(res.status, 200);
		assert.match(await res.text(), /\[DONE\]/);
		assert.equal(seen.length, 2, "one rate-limited attempt, one retry");
		assert.equal(seen[0].url, "/openai/chat/completions");
		assert.equal(seen[1].body, payload, "body is forwarded byte for byte on the retry");
		assert.match(seen[0].ua, /^so-agent-eval\//);
		assert.ok(seen[1].at - seen[0].at >= 1500, "waits for the advertised retry time");
	} finally {
		proxy.kill();
		upstream.close();
	}
});

test("repairStream moves a nameless continuation chunk back to the open tool call and leaves normal streams alone", async () => {
	const { repairStream } = await import("../bench/eval/repair-stream.mjs");
	const chunk = (tool_calls, extra = {}) => `data: ${JSON.stringify({ choices: [{ index: 0, delta: { tool_calls }, ...extra }] })}\n\n`;
	const broken = [
		chunk([{ index: 0, id: "c1", type: "function", function: { name: "read", arguments: "" } }]),
		chunk([{ index: 0, function: { arguments: '{"path":"a.js","limit":' } }]),
		chunk([{ index: 1, function: { arguments: "200}" } }], { finish_reason: "tool_calls" }),
		"data: [DONE]\n\n",
	].join("");
	const repair = repairStream();
	// feed in arbitrary slices: chunk boundaries must not matter
	let out = "";
	for (let i = 0; i < broken.length; i += 37) out += repair(broken.slice(i, i + 37));
	out += repair("", true);
	const indexes = out.split("\n").filter((l) => l.startsWith("data: {")).map((l) => JSON.parse(l.slice(6)).choices[0].delta.tool_calls[0].index);
	assert.deepEqual(indexes, [0, 0, 0]);
	assert.match(out, /data: \[DONE\]/);

	// two genuine parallel calls (second has id and name) are untouched
	const parallel = [chunk([{ index: 0, id: "a", function: { name: "read", arguments: "{}" } }]), chunk([{ index: 1, id: "b", function: { name: "bash", arguments: "{}" } }])].join("");
	const r2 = repairStream();
	assert.equal(r2(parallel) + r2("", true), parallel + "\n");
});
