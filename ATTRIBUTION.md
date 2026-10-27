# Attribution

**so agent** is based on **Pi** by Mario Zechner and contributors
(<https://github.com/earendil-works/pi>, formerly `badlogic/pi-mono`),
which is distributed under the MIT License. The original `LICENSE` file,
including the copyright notice `Copyright (c) 2025 Mario Zechner`, is kept
unchanged in this repository, as the license requires.

Forked from upstream commit `6c384aa30f619d7b28963f2bab24d8dacbe73cb6`
(Pi 1.4.0, 2026-10-26).

Changes made in this fork:

- Everything user-visible and internal was renamed from Pi to so agent
  (see `rename/rename.sh`, which reproduces the rename from an upstream checkout).
- Efficiency work (see `docs/EFFICIENCY.md`).

Kept verbatim on purpose: `LICENSE`, `packages/mcp/LICENSES/`, the upstream
`CHANGELOG.md` files (release history of the upstream project), recorded test
fixtures, links to upstream issues and pull requests, and the URLs of
upstream-hosted services (see `docs/UPSTREAM-ENDPOINTS.md`).

so agent is an independent derivative. It is not affiliated with or endorsed by
the Pi authors, and upstream maintainers do not support it.
