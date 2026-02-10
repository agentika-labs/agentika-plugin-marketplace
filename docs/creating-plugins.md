# Creating Plugins

This guide covers how to author plugins for the Agentika Marketplace.

## Quick Start

1. Create the plugin directory:
   ```bash
   mkdir -p plugins/my-plugin/skills/my-skill
   ```

2. Create `plugins/my-plugin/plugin.json` with your metadata

3. Create `plugins/my-plugin/skills/my-skill/SKILL.md` with your skill definition

4. Validate:
   ```bash
   bun run scripts/validate.ts
   ```

## Plugin Structure

```
my-plugin/
├── plugin.json           # Required: Plugin metadata
├── agents/               # Optional: Agent definitions
│   └── my-agent.md
└── skills/
    └── my-skill/
        └── SKILL.md      # Required: Skill definition
```

## plugin.json Schema

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "Brief description of what the plugin does",
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "category": "utilities",
  "homepage": "https://github.com/you/my-plugin",
  "repository": "https://github.com/you/my-plugin"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique kebab-case identifier |
| `version` | string | Semantic version (x.y.z) |
| `description` | string | Brief description (1-2 sentences) |
| `author` | object | Author info with `name`, optional `email` |
| `category` | string | One of the valid category IDs |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `license` | string | License identifier (default: MIT) |
| `keywords` | string[] | Searchable keywords |
| `homepage` | string | Documentation URL |
| `repository` | string | Source code URL |

### Valid Categories

The `category` field is metadata in `plugin.json` — it does not correspond to a filesystem directory. Valid values:

- `utilities` - General utilities

## SKILL.md Format

See [skill-format.md](skill-format.md) for the complete specification.

### Minimal Example

```markdown
---
name: my-skill
description: |
  Use this skill when the user asks to "do X", "perform Y",
  or mentions specific keywords.
version: 0.1.0
---

# My Skill

Brief description of what this skill does.

## Quick Start

\`\`\`typescript
// Minimal working example
const result = await doSomething();
\`\`\`

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `MY_API_KEY` | Yes | API key for the service |
```

## Examples Directory

Add working code examples that demonstrate the skill:

```
examples/
├── basic.ts           # Simple usage
├── with-options.ts    # Using configuration options
└── error-handling.ts  # Handling common errors
```

### Example File Template

```typescript
/**
 * Example: Basic usage of my-skill
 *
 * Prerequisites:
 * - Set MY_API_KEY environment variable
 *
 * Usage:
 * bun run examples/basic.ts
 */

// Implementation
async function main() {
  const apiKey = process.env.MY_API_KEY;
  if (!apiKey) throw new Error("MY_API_KEY required");

  // Your example code here
}

main().catch(console.error);
```

## References Directory

Add supplementary documentation for complex skills:

```
references/
├── api-schema.md      # API request/response schemas
├── advanced.md        # Advanced patterns
└── troubleshooting.md # Common issues and solutions
```

## Best Practices

### Trigger Phrases

Write descriptions that help agents discover your skill:

```yaml
# Good - specific, varied trigger phrases
description: |
  Use this skill when the user asks to "create a Stripe checkout",
  "process credit card payments", "add payment integration",
  or mentions Stripe, PaymentIntent, or checkout sessions.

# Bad - too vague
description: Payment stuff
```

### Environment Variables

- Document all required environment variables
- Use consistent naming: `SERVICE_API_KEY`, `SERVICE_BASE_URL`
- Never hardcode secrets in examples

### Examples

- Keep examples focused and minimal
- Include necessary imports
- Add comments explaining key steps
- Show error handling patterns

### Code Quality

- Use TypeScript for examples
- Format code consistently
- Include type annotations
- Follow the service's official patterns

## Multi-Skill Plugins

For plugins with multiple related skills:

```
my-plugin/
├── plugin.json
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    ├── skill-two/
    │   └── SKILL.md
    └── shared/
        └── (shared utilities)
```

Each skill should be self-contained but can reference shared code.

## Testing Your Plugin

1. **Validate structure:**
   ```bash
   bun run scripts/validate.ts
   ```

2. **Test locally:**
   ```bash
   claude --plugin-dir ./plugins/my-plugin
   ```

3. **Verify trigger phrases:**
   - Ask Claude to describe the skill
   - Test each trigger phrase mentioned in the description

## Submitting

Once validated, submit via pull request. See [CONTRIBUTING.md](../CONTRIBUTING.md).
