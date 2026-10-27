# Contributing to so agent

so agent is a fork of [Pi](https://github.com/earendil-works/pi). Its core stays minimal: if a feature does not
belong in the core, make it an extension.

- You must understand your code. If you cannot explain what a change does and how it interacts with the rest of
  the system, it will not be merged.
- AI-assisted code is fine. Unreviewed AI output is not. Agents working in this repo must follow [AGENTS.md](AGENTS.md).
- Keep changes small and tested. Run `npm run check` and `./test.sh` before committing.
- Do not send issues, pull requests, or comments to the upstream Pi repository about so agent. Bugs in code that
  also exists upstream should be reproduced against upstream Pi first.
