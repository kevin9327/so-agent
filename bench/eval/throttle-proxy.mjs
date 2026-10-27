// Local pass-through for OpenAI-compatible endpoints with a hard per-IP rate limit (for example anonymous free tiers).
// It spaces upstream calls by --min-interval-ms and, on a rate-limit answer before any bytes were streamed, waits and
// retries, so the limit is respected instead of evaded. It never changes request bodies.
//   node bench/eval/throttle-proxy.mjs --upstream https://host/openai --port 8787 --min-interval-ms 31000 [--log-errors errors.jsonl]
import { appendFileSync } from "node:fs";
import { createServer } from "node:http";

const arg = (n, d) => {
	const i = process.argv.indexOf(`--${n}`);
	return i >= 0 ? process.argv[i + 1] : d;
};
const upstream = arg("upstream");
const port = Number(arg("port", "8787"));
const minInterval = Number(arg("min-interval-ms", "31000"));
const maxRetries = Number(arg("max-retries", "6"));
const ua = arg("user-agent", "so-agent-eval/0.0.1");
const errorLog = arg("log-errors"); // optional file: request body and answer of every non-2xx final response (no headers, so no keys)
if (!upstream) throw new Error("--upstream is required");

let last = 0;
let queue = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slot = () => {
	const next = queue.then(async () => {
		const wait = last + minInterval - Date.now();
		if (wait > 0) await sleep(wait);
		last = Date.now();
	});
	queue = next.catch(() => {});
	return next;
};

export const stats = { forwarded: 0, retried: 0, failed: 0 };

createServer(async (req, res) => {
	const chunks = [];
	for await (const c of req) chunks.push(c);
	const body = Buffer.concat(chunks);
	const url = upstream.replace(/\/$/, "") + req.url.replace(/^\/v1/, "");
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		await slot();
		const r = await fetch(url, { method: req.method, headers: { "content-type": "application/json", "user-agent": ua, authorization: req.headers.authorization ?? "" }, body: req.method === "GET" ? undefined : body });
		if ((r.status === 402 || r.status === 429) && attempt < maxRetries) {
			const text = await r.text();
			const m = /retry after (\d+)s/i.exec(text);
			stats.retried++;
			console.error(`[proxy] ${r.status} rate limited, waiting ${m ? m[1] : "?"}s (attempt ${attempt + 1})`);
			await sleep((m ? Number(m[1]) : 30) * 1000 + 1000);
			continue;
		}
		stats.forwarded++;
		if (errorLog && !r.ok) {
			const text = await r.text();
			appendFileSync(errorLog, `${JSON.stringify({ at: new Date().toISOString(), status: r.status, request: body.toString("utf8"), response: text })}\n`);
			res.writeHead(r.status, { "content-type": r.headers.get("content-type") ?? "application/json" }).end(text);
			return;
		}
		res.writeHead(r.status, { "content-type": r.headers.get("content-type") ?? "application/json" });
		if (r.body) for await (const c of r.body) res.write(c);
		res.end();
		return;
	}
	stats.failed++;
	res.writeHead(502).end("rate limit retries exhausted");
}).listen(port, "127.0.0.1", () => console.error(`[proxy] 127.0.0.1:${port} -> ${upstream}, one call per ${minInterval} ms`));
