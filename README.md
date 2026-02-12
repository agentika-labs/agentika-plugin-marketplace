# Agentika Plugin Marketplace

Reusable plugins and skills for Claude Code. Each plugin adds prompt-based capabilities that agents can discover and invoke.

## Quick Start

### Install a Plugin

```bash
# Using npx (recommended)
npx add-skill agentika-labs/agentika-plugin-marketplace/plugins/<plugin-name>

# Manual installation
cp -r plugins/<plugin-name> ~/.claude/skills/

# Session-only (temporary)
claude --plugin-dir ./plugins/<plugin-name>
```

## Plugins

Plugins live directly under `plugins/`:

| Plugin | Description |
|--------|-------------|
| [grepika](plugins/grepika/) | Codebase exploration with trigram indexing, FTS5 search, and semantic file discovery |
| [humanika](plugins/humanika/) | Detect and fix AI writing patterns so text sounds like a person wrote it |
| [jj](plugins/jj/) | JJ (Jujutsu) version control workflows with Git colocation and parallel workspaces |
| [change-journal](plugins/change-journal/) | Track file changes across sessions for cross-workspace awareness |

Categories live in each plugin's `plugin.json`, not as filesystem directories.

## Plugin Structure

Each plugin follows this structure:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json       # Plugin metadata (required)
├── hooks/                # Optional: lifecycle hooks
│   ├── hooks.json
│   └── scripts/
├── skills/               # At least one skill required
│   └── my-skill/
│       └── SKILL.md      # Skill definition with YAML frontmatter
└── agents/               # Optional: agent definitions
    └── my-agent.md
```

## Documentation

- [Installation Methods](docs/installation.md) - Detailed installation options
- [Creating Plugins](docs/creating-plugins.md) - Author your own plugins
- [SKILL.md Format](docs/skill-format.md) - Skill specification reference
- [Team Enforcement](docs/team-enforcement.md) - Lockfile-based skill verification

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting plugins.

## Scripts

```bash
# Validate plugin structure
bun run scripts/validate.ts

# Regenerate marketplace index
bun run scripts/generate-index.ts

# Generate lockfile from current plugins
bun run scripts/generate-lock.ts

# Validate lockfile matches actual skills
bun run scripts/validate-lock.ts

# Add an external skill with SHA pinning
bun run scripts/add-external.ts <repo-url> <skill-path>

# Sync vendored external skills with upstream
bun run scripts/sync-external.ts
```

## License

[MIT](LICENSE.md)
