# Install report (anonymous install counter)

The install report is **on** in so agent (setting `enableInstallTelemetry`, default `true`), but it has **no default
endpoint**, so nothing is sent until you point it at a receiver you run. Upstream's counter is not used on purpose: it
would count so installs as Pi installs.

## What is sent

One `GET` request, the first time a version starts on a machine (a fresh install, or the first start after an update):

```
GET <SO_INSTALL_REPORT_URL>?version=<so version>
User-Agent: so/<so version> ...
```

No body, no cookies, no identifiers, no file paths, no prompts. The receiver sees what any HTTP request exposes (source
IP, user agent). The request has a 5 s timeout and its result is ignored. It is skipped when `SO_OFFLINE` is set.

## Turn it on

```bash
export SO_INSTALL_REPORT_URL=https://counter.example.org/install   # your receiver
so
```

A `?` in the URL is respected; `version` is appended with `&` then.

## Turn it off

Any one of: setting `enableInstallTelemetry: false` in `~/.so/agent/settings.json` (or the project `.so/settings.json`), `SO_TELEMETRY=0`, `SO_OFFLINE=1`, or
leaving `SO_INSTALL_REPORT_URL` unset.

## Receiver

Any endpoint that answers `GET` with a 2xx and logs the query string works: a web server access log, a serverless
function, or this minimal Node receiver (not hosted by this repo):

```js
import { createServer } from "node:http";
createServer((req, res) => {
	const url = new URL(req.url, "http://x");
	if (url.pathname === "/install") console.log(JSON.stringify({ at: new Date().toISOString(), version: url.searchParams.get("version") }));
	res.writeHead(204).end();
}).listen(8080);
```

Count lines per `version` to get installs per release. Put it behind HTTPS before using it in a default build.

## Status

A receiving endpoint has to be provided by the project owner. Until then so agent sends nothing. Related variables are
in `packages/coding-agent/docs/environment-variables.md`; the other upstream services so can call are in
`docs/UPSTREAM-ENDPOINTS.md`.
