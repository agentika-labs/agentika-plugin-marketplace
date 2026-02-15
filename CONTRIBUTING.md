# Contributing to Agentika Plugin Marketplace

Thank you for your interest in contributing plugins to the Agentika Marketplace!

## Plugin Requirements

### Structure

Every plugin must include:

1. **`.claude-plugin/plugin.json`** - Plugin metadata with required fields:
   - `name` - Unique kebab-case identifier
   - `version` - Semantic version (e.g., `0.1.0`)
   - `description` - Brief description of the plugin
   - `author` - Object with `name` and optional `email`

2. **At least one of** the following content types:
   - `skills/` — Each skill in its own directory with a `SKILL.md` file
   - `commands/` — Command markdown files
   - `hooks.json` — Lifecycle hooks (declare with `"hooks": "./hooks.json"` in plugin.json)
   - `agents/` — Agent definitions

### SKILL.md Format

Skills must have YAML frontmatter with:

```yaml
---
name: my-skill-name
description: |
  Use this skill when the user asks to "do X", "perform Y",
  or mentions related keywords.
version: 0.1.0
---
```

See [docs/skill-format.md](docs/skill-format.md) for the full specification.

## Submission Process

### 1. Fork the Repository

```bash
git clone https://github.com/agentika-labs/agentika-plugin-marketplace.git
cd agentika-plugin-marketplace
```

### 2. Create Your Plugin

```bash
# Create your plugin directory
mkdir -p plugins/my-plugin/{.claude-plugin,skills/my-skill}

# Edit .claude-plugin/plugin.json and skills/my-skill/SKILL.md
```

### 3. Validate Your Plugin

```bash
bun run scripts/validate.ts
```

Ensure validation passes before submitting.

### 4. Submit a Pull Request

1. Create a branch: `git checkout -b add-my-plugin`
2. Commit your changes: `git commit -m "Add my-plugin"`
3. Push: `git push origin add-my-plugin`
4. Open a PR with:
   - Brief description of the plugin
   - Any required environment variables
   - Example use cases

## Code Standards

### Naming Conventions

- Plugin names: `kebab-case` (e.g., `stripe-payments`)
- Skill names: `kebab-case` (e.g., `create-checkout`)
- No special characters or spaces

### Description Best Practices

Write trigger phrases that help agents discover your skill:

```yaml
# Good - specific trigger phrases
description: |
  Use this skill when the user asks to "create a Stripe checkout",
  "process payments with Stripe", "add payment integration",
  or mentions Stripe API, PaymentIntent, or checkout sessions.

# Bad - too generic
description: Handles payments
```

### Examples

Include working examples in `examples/` directory:

- Name files descriptively (e.g., `create-checkout.ts`)
- Include necessary imports
- Add comments explaining key steps
- Use environment variables for secrets

### References (Optional)

Add supplementary documentation in `references/`:

- API schemas
- Advanced patterns
- Troubleshooting guides

## Review Criteria

PRs are reviewed for:

1. **Completeness** - All required files present
2. **Validation** - Passes `validate.ts` script
3. **Quality** - Clear descriptions, working examples
4. **Uniqueness** - Doesn't duplicate existing plugins
5. **Security** - No hardcoded secrets, follows best practices

## Questions?

Open an issue for questions or feedback about the contribution process.
