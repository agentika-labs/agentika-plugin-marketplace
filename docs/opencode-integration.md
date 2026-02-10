# OpenCode Integration

This marketplace supports both Claude Code and [OpenCode](https://opencode.dev) through a unified skill format.

## How It Works

OpenCode supports loading skills from the `.claude/skills/` directory, using the same SKILL.md format as Claude Code. This means:

1. **Single source of truth** - Write skills once, use everywhere
2. **No duplication** - The same SKILL.md works for both systems
3. **Superset compatibility** - Claude Code's stricter requirements become the baseline; OpenCode ignores extra fields

## Installing Skills for OpenCode

### From the Marketplace

```bash
# Clone the marketplace
git clone https://github.com/agentika-labs/agentika-plugin-marketplace.git
cd agentika-plugin-marketplace

# Install a skill
./oc.sh install my-skill

# Or install to a specific project
cd /path/to/your/project
mkdir -p .claude/skills
/path/to/plugin-marketplace/oc.sh install my-skill
```

### From External Sources

Install skills from any Git repository with SHA pinning:

```bash
./oc.sh install github.com/anthropics/claude-skills@abc1234
```

## SKILL.md Format

The unified format includes optional fields for OpenCode compatibility:

```yaml
---
# Required (both systems)
name: my-skill
description: |
  Use this skill when the user asks to...
version: 0.1.0

# Optional (OpenCode compatibility)
license: MIT
compatibility: [claude-code, opencode]
metadata:
  author: Your Name
  tags: [api, integration]
---

# My Skill

Skill documentation in Markdown...
```

### Required Fields

| Field | Description |
|-------|-------------|
| `name` | Unique skill identifier (kebab-case) |
| `description` | Trigger phrases for agent discovery |
| `version` | Semantic version (x.y.z) |

### Optional Fields

| Field | Description |
|-------|-------------|
| `license` | SPDX license identifier |
| `compatibility` | Target systems (`claude-code`, `opencode`) |
| `metadata.author` | Skill author name |
| `metadata.tags` | Searchable tags |

## Project Structure

Skills can be installed at two levels:

### User-Level (~/.claude/skills/)

Available to all projects. Use for personal utilities and general-purpose skills.

```bash
./oc.sh install my-skill --user
```

### Project-Level (.claude/skills/)

Scoped to a specific project. Use for project-specific skills that should be shared with the team.

```bash
mkdir -p .claude/skills
./oc.sh install my-skill
```

## Version Compatibility

| Feature | Claude Code | OpenCode |
|---------|-------------|----------|
| name | Required | Required |
| description | Required | Required |
| version | Required | Optional |
| license | Ignored | Supported |
| compatibility | Ignored | Supported |
| metadata | Ignored | Supported |

## Troubleshooting

### Skill Not Loading in OpenCode

1. Verify the skill is in `.claude/skills/` or `~/.claude/skills/`
2. Check that SKILL.md exists and has valid frontmatter
3. Ensure the `name` field is kebab-case

### Skill Works in Claude Code but Not OpenCode

1. Check the `compatibility` field isn't excluding OpenCode
2. Verify any system-specific code is properly guarded
3. Review the skill for Claude Code-specific features

## Resources

- [Skill Format Specification](skill-format.md)
- [Team Enforcement](team-enforcement.md)
- [OpenCode Documentation](https://opencode.dev/docs)
