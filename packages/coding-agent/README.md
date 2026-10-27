# so agent (coding-agent)

`so` is a minimal, extensible terminal coding agent, a fork of [Pi](https://github.com/earendil-works/pi) (MIT).
See the [repository README](../../README.md) and [ATTRIBUTION.md](../../ATTRIBUTION.md).

Adapt `so` to your workflows with [extensions](docs/extensions.md), [skills](docs/skills.md), [prompt templates](docs/prompt-templates.md), and [themes](docs/themes.md). Bundle them as [so packages](docs/packages.md) and share via npm or git.

## Getting started

Build from source (see the repository README), then:

Start So in the directory where you want it to work:

```bash
cd /path/to/project
so
```

For a built-in AI provider, run `/login` inside So to connect a subscription or API key. Then give So a task.

See the [documentation](docs/index.md) for full setup and usage instructions.

## Development

Clone the repository, install its dependencies, and run So from source:

```bash
git clone https://github.com/earendil-works/pi
cd so
npm install --ignore-scripts
./so-test.sh
```

`so-test.sh` can be called from any directory and preserves the caller's working directory.

Before submitting changes, run:

```bash
npm run check
./test.sh
```

Read [CONTRIBUTING.md](https://github.com/earendil-works/pi/blob/main/CONTRIBUTING.md) before opening an issue or pull request. It defines the contribution gate, issue quality bar, and required checks. Read [AGENTS.md](https://github.com/earendil-works/pi/blob/main/AGENTS.md) for repository-specific implementation, testing, dependency, and release rules.

## License

MIT
