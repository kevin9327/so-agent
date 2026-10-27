# Upstream endpoints

so agent inherits URLs that point at services run by the upstream Pi project. Every feature that uses one is kept. Where
using the upstream default would be wrong for a fork (it would offer or install Pi, or count so as Pi), the default
is replaced and the old behavior is available through an environment variable.

| Endpoint | Used for | so agent behavior |
|---|---|---|
| `https://pi.dev/api/latest-version` | update check at startup, `so update --self` | **Replaced.** The upstream feed would offer, and `so update --self` would install, Pi. The default is the npm registry entry of the installed package (`https://registry.npmjs.org/@so-agent%2fcoding-agent/latest`). It answers 404 until the package is published, and then the check is silent. `SO_UPDATE_URL` points at any feed that returns `{ "version", "packageName"?, "note"? }` or a registry `{ "name", "version" }`. `SO_SKIP_VERSION_CHECK` and `SO_OFFLINE` turn it off. |
| `https://pi.dev/api/models/providers/<id>` | remote model catalog overlay | **On by default, as upstream.** so sends `pi-version=1.4.0` itself (`CATALOG_PROTOCOL_VERSION`) so the server returns a revision this code understands. `SO_CATALOG_URL` selects another host, `SO_CATALOG_URL=off` disables the overlay. `SO_OFFLINE` disables all network requests. |
| `https://pi.dev/api/report-install` | anonymous install counter (setting `enableInstallTelemetry`, `SO_TELEMETRY`) | **Replaced.** The upstream counter would count so as Pi. The code and setting are intact; the endpoint comes from `SO_INSTALL_REPORT_URL` and there is no default, so nothing is sent until you set one. |
| `pi.dev/install.sh`, `install.ps1`, `https://pi.dev/api/installer/releases` | managed installer, hint printed after `so update --self` | **Replaced for the hint.** The upstream installer installs Pi. The post-update hint prints only when `SO_INSTALLER_URL` / `SO_INSTALLER_PS1_URL` name an so installer. The installer-managed update path itself is unchanged (`SO_INSTALLER_API_BASE`). |
| `https://pi.dev/session/` | `/share` viewer | Unchanged. Override with `SO_SHARE_VIEWER_URL`. |
| `https://pi.dev/oauth/*/client.json` | MCP OAuth client metadata (`clientRegistration: "cimd"`, opt-in) | Unchanged. The default is dynamic client registration. |
| `https://radius.pi.dev` | Radius provider gateway | Unchanged. Only used with Radius credentials. |
| `https://pi.dev/schemas/*.schema.json` | `$schema` hints in JSON files | Unchanged. Cosmetic. |
| `ai/src/utils/identity.ts` `SO_ATTRIBUTION.url` | `HTTP-Referer` to OpenRouter | Points at the so repository (placeholder `https://github.com/kevin9327/so-agent`). The upstream value would credit Pi's site for so's traffic. |
| Upstream issue and PR links, `github.com/earendil-works/pi` | comments, changelogs | Kept as history and attribution. |

`scripts/model-catalog-protocol.ts` is the wire protocol shared with the upstream server and keeps the upstream names
(`pi-version`, `pi/<version>`).
