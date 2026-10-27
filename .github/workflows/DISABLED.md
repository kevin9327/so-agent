# Disabled upstream workflows

The `*.yml.disabled` files here are upstream Pi's maintainer-governance and publishing workflows, kept (with so's names) so nothing
is lost, but renamed so GitHub does not run them. They use `github.repository`, so in this repository they would:

- auto-close issues and pull requests from "new contributors" against upstream's `.github/APPROVED_CONTRIBUTORS` list
  (`issue-gate`, `pr-gate`, `approve-contributor`, `remove-inprogress-on-close`, `issue-triage-labels`),
- run an issue-analysis agent that checks membership of upstream's `earendil-works/staff` team (`issue-analysis`),
- publish preview packages and the model catalog to upstream's infrastructure (`preview-packages`, `publish-model-catalog`).

Adapt one to this repository (contributor list, team, secrets, destinations), then rename it back to `*.yml` to enable it.
`rename/rename.mjs` produces this layout (`DISABLED_WORKFLOWS`).
