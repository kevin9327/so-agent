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
