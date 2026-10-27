# Upstream endpoints

so agent inherits a few URLs that point at services run by the upstream Pi project. so agent does not rely on them.

| Endpoint | Used for | so agent behavior |
|---|---|---|
| `https://pi.dev/api/latest-version` | update check, `so update self` | Off. Set `SO_UPDATE_URL` to your own JSON feed `{ "version": "x.y.z", "packageName"?, "note"? }` to enable. |
| `https://pi.dev/api/report-install` | anonymous install ping | Removed. |
| `https://pi.dev/api/models` | remote model catalog overlay | Off. Bundled model data is used. Set `SO_CATALOG_URL` to opt in. |
| `https://pi.dev/api/installer/releases`, `install.sh`, `install.ps1` | managed installer | Not used. Install hints were removed. |
| `https://pi.dev/session/` | `/share` viewer | Unchanged. Override with `SO_SHARE_VIEWER_URL`. |
| `https://pi.dev/oauth/*/client.json` | MCP OAuth client metadata (`clientRegistration: "cimd"`, opt-in) | Unchanged. Default is dynamic client registration. |
| `https://radius.pi.dev` | Radius provider gateway | Unchanged. Only used with Radius credentials. |
| `https://pi.dev/schemas/*.schema.json` | `$schema` hints in JSON files | Unchanged. Cosmetic. |
| Upstream issue and PR links, `github.com/earendil-works/pi` | comments, changelogs | Kept as history and attribution. |

`scripts/model-catalog-protocol.ts` is the wire protocol shared with the upstream server and keeps the upstream names
(`pi-version`, `pi/<version>` user agent).
