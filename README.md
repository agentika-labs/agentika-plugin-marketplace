# Agentika Plugin Marketplace

Plugins for Claude Code. Each one adds skills, hooks, or agent definitions that extend what Claude Code can do. Think code cleanup, version control workflows, desktop notifications, and more.

## Plugins

| Plugin | Description |
|--------|-------------|
| [change-journal](plugins/change-journal/) | Track file changes across agent sessions for cross-workspace awareness |
| [clip](plugins/clip/) | Copy clean text to clipboard without terminal formatting artifacts |
| [deslop](plugins/deslop/) | Detect and remove AI-generated code patterns (slop) from your branch |
| [grepika](plugins/grepika/) | Token-efficient codebase exploration with trigram indexing and FTS5 search |
| [humanika](plugins/humanika/) | Detect and fix AI writing patterns so text sounds human-written |
| [jj](plugins/jj/) | JJ (Jujutsu) version control with Git colocation and parallel workspaces |
| [notify](plugins/notify/) | macOS desktop notifications for Claude Code lifecycle events |
| [optimization-hints](plugins/optimization-hints/) | Surface workflow optimization hints when sessions accumulate many tool calls |
| [personas](plugins/personas/) | Engineering persona commands for backend, frontend, fullstack, infra, and observability |
| [prompt-engineering](plugins/prompt-engineering/) | Socratic reasoning for deep analysis and task completion verification |

## Installation

```bash
# Using npx (recommended)
npx add-skill agentika-labs/agentika-plugin-marketplace/plugins/<plugin-name>

# Manual installation
cp -r plugins/<plugin-name> ~/.claude/skills/

# Session-only (temporary)
claude --plugin-dir ./plugins/<plugin-name>
```

## Documentation

- [Installation Methods](docs/installation.md) - Detailed installation options
- [Creating Plugins](docs/creating-plugins.md) - Author your own plugins
- [SKILL.md Format](docs/skill-format.md) - Skill specification reference
- [Team Enforcement](docs/team-enforcement.md) - Lockfile-based skill verification

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on creating and submitting plugins.

## License

[MIT](LICENSE.md)
