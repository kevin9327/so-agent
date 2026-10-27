# Sections of the upstream Pi README that do not apply to so agent

These sections were removed from `README.md` because they speak for the upstream Pi project or describe its
services. They are kept here verbatim (names changed by the rename codemod) so nothing is lost. "I" in the text is
Mario Zechner, Pi's author, not the maintainers of so agent.

## Run with Nix (upstream)

`nix run github:earendil-works/pi/stable` in the upstream README runs **Pi**. so agent has not tested its flake; the Nix
build files are inherited (see `nix/` and `flake.nix`).

## Share your OSS coding agent sessions

If you use So or other coding agents for open source work, please share your sessions.

Public OSS session data helps improve coding agents with real-world tasks, tool use, failures, and fixes instead of toy benchmarks.

For the full explanation, see [this post on X](https://x.com/badlogicgames/status/2037811643774652911).

To publish sessions, use [`badlogic/so-share-hf`](https://github.com/badlogic/pi-share-hf). Read its README.md for setup instructions. All you need is a Hugging Face account, the Hugging Face CLI, and `so-share-hf`.

You can also watch [this video](https://x.com/badlogicgames/status/2041151967695634619), where I show how I publish my `so-agent` sessions.

I regularly publish my own `so-agent` work sessions here:

- [badlogicgames/pi-mono on Hugging Face](https://huggingface.co/datasets/badlogicgames/pi-mono)



## Footer (upstream)

pi.dev domain graciously donated by exe.dev.
