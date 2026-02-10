# Agentika Plugin Marketplace

A curated collection of AI agent plugins for Claude Code and compatible agents.

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

| Plugin | Category | Description |
|--------|----------|-------------|
| [grepika](plugins/grepika/) | utilities | Token-efficient codebase exploration with trigram indexing |

Categories are declared in each plugin's `plugin.json`, not as filesystem directories.

## Plugin Structure

Each plugin follows this structure:

```
my-plugin/
├── plugin.json           # Plugin metadata
├── agents/               # Optional: Agent definitions
│   └── my-agent.md
└── skills/
    └── my-skill/
        └── SKILL.md      # Skill definition
```

## Documentation

- [Installation Methods](docs/installation.md) - Detailed installation options
- [Creating Plugins](docs/creating-plugins.md) - Author your own plugins
- [SKILL.md Format](docs/skill-format.md) - Skill specification reference
- [OpenCode Integration](docs/opencode-integration.md) - Using plugins with OpenCode
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
