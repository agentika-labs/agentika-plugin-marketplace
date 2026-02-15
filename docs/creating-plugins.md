# Creating Plugins

This guide covers how to author plugins for the Agentika Marketplace.

## Quick Start

1. Create the plugin directory:
   ```bash
   mkdir -p plugins/my-plugin/{.claude-plugin,skills/my-skill}
   ```

2. Create `plugins/my-plugin/.claude-plugin/plugin.json` with your metadata

3. Add content — at least one of:
   - `skills/my-skill/SKILL.md` — a skill definition
   - `commands/my-command.md` — a command definition
   - `hooks.json` — lifecycle hooks
   - `agents/my-agent.md` — an agent definition

4. Validate:
   ```bash
   bun run scripts/validate.ts
   ```

## Plugin Structure

A plugin must have `.claude-plugin/plugin.json` and at least one of: `skills/`, `commands/`, `agents/`, or a `hooks.json`.

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json       # Required: Plugin metadata
├── skills/               # Optional: Skill definitions
│   └── my-skill/
│       └── SKILL.md
├── commands/             # Optional: Command definitions
│   └── my-command.md
├── agents/               # Optional: Agent definitions
│   └── my-agent.md
├── hooks.json            # Optional: Lifecycle hooks
└── README.md             # Recommended
```

## plugin.json Schema

Located at `.claude-plugin/plugin.json` inside each plugin directory:

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

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `license` | string | License identifier (default: MIT) |
| `keywords` | string[] | Searchable keywords for discovery |
| `hooks` | string | Relative path to hooks.json (e.g., `"./hooks.json"`) |
| `homepage` | string | Documentation URL |
| `repository` | string | Source code URL |

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

## Hooks

Hooks let plugins react to Claude Code lifecycle events (session start, stop, notifications, file changes, etc.). Place a `hooks.json` at the plugin root and declare it in `plugin.json`:

```json
{
  "hooks": "./hooks.json"
}
```

If `hooks.json` is at the default Claude Code location (`hooks/hooks.json`), the declaration is optional. Otherwise, the `"hooks"` field in `plugin.json` is required for discoverability.

A hooks-only plugin (no skills, commands, or agents) is valid — for example, a notification plugin that only uses lifecycle hooks.

### hooks.json Format

```json
{
  "description": "What these hooks do",
  "hooks": {
    "EventName": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "async": true
          }
        ]
      }
    ]
  }
}
```

Hook types: `"command"` (runs a shell command) or `"agent"` (runs an agent prompt with a timeout).

### Shell Scripts in Hooks

Any `.sh` files in the plugin must have executable permissions (`chmod +x`). The validator checks this automatically.

## Commands

Commands are markdown files in the `commands/` directory that users invoke via `/command-name`. Each command file has YAML frontmatter with a `description` field:

```markdown
---
description: What this command does
---

Your command prompt content here. Use `$ARGUMENTS` for user input.
```

Commands are simpler than skills — they don't require `name` or `version` in frontmatter. The filename becomes the command name.

## Agents

Agent definitions go in the `agents/` directory as markdown files. Use agents for specialized sub-tasks that need their own context.

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
├── .claude-plugin/
│   └── plugin.json
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
