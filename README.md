# Agentika Plugin Marketplace

A curated collection of AI agent plugins for Claude Code and compatible agents.

## Quick Start

### Install a Plugin

```bash
# Using npx (recommended)
npx add-skill agentika/plugin-marketplace/plugins/<category>/<plugin-name>

# Manual installation
cp -r plugins/<category>/<plugin-name> ~/.claude/skills/

# Session-only (temporary)
claude --plugin-dir ./plugins/<category>/<plugin-name>
```

## Categories

| Category | Description |
|----------|-------------|
| [ai-integration](plugins/ai-integration/) | LLM and AI service integrations (OpenAI, Anthropic, xAI, etc.) |
| [database](plugins/database/) | Database clients and ORMs (PostgreSQL, Supabase, MongoDB, etc.) |
| [api-services](plugins/api-services/) | Third-party API integrations (Stripe, Twilio, SendGrid, etc.) |
| [devops](plugins/devops/) | Deployment and infrastructure (Docker, Kubernetes, Terraform, etc.) |
| [testing](plugins/testing/) | Testing frameworks and utilities (Playwright, Vitest, Jest, etc.) |
| [ui-frameworks](plugins/ui-frameworks/) | UI components and design systems (React, Vue, Tailwind, etc.) |
| [utilities](plugins/utilities/) | General-purpose utilities and helpers |

## Plugin Structure

Each plugin follows this structure:

```
my-plugin/
├── plugin.json           # Plugin metadata
└── skills/
    └── my-skill/
        ├── SKILL.md      # Skill definition with trigger phrases
        ├── examples/     # Usage examples
        └── references/   # Additional documentation (optional)
```

## Documentation

- [Installation Methods](docs/installation.md) - Detailed installation options
- [Creating Plugins](docs/creating-plugins.md) - Author your own plugins
- [SKILL.md Format](docs/skill-format.md) - Skill specification reference

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting plugins.

## Scripts

```bash
# Validate plugin structure
bun run scripts/validate.ts

# Regenerate marketplace index
bun run scripts/generate-index.ts
```

## License

[MIT](LICENSE.md)
