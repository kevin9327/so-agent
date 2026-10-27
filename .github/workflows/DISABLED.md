# Disabled upstream workflows

The `*.yml.disabled` files here are upstream Pi's maintainer-governance and publishing workflows, kept (with so's names) so nothing
is lost, but renamed so GitHub does not run them. They use `github.repository`, so in this repository they would:

- auto-close issues and pull requests from "new contributors" against upstream's `.github/APPROVED_CONTRIBUTORS` list
  (`issue-gate`, `pr-gate`, `approve-contributor`, `remove-inprogress-on-close`, `issue-triage-labels`),
- run an issue-analysis agent that checks membership of upstream's `earendil-works/staff` team (`issue-analysis`),
- `nix` and `build-binaries`: untested on this fork. A tag push ran both on v0.0.3: `nix` failed in its build matrix, and `build-binaries` refused to attach assets because the release was already published (it expects to create the release itself as a draft). Re-enable them after adapting the flake hashes and the release flow,
- publish preview packages and the model catalog to upstream's infrastructure (`preview-packages`, `publish-model-catalog`).

Adapt one to this repository (contributor list, team, secrets, destinations), then rename it back to `*.yml` to enable it.
`rename/rename.mjs` produces this layout (`DISABLED_WORKFLOWS`).
