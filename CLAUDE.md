# Agentika Plugin Marketplace

A curated marketplace of plugins and skills for AI coding agents (Claude Code, OpenCode). Plugins provide reusable prompt-based skills that agents can discover and invoke.

## Commands

All scripts use Bun. Install dependencies first: `bun install`

| Command | Purpose |
|---------|---------|
| `bun run scripts/validate.ts` | Validate all plugins in `plugins/` and `templates/` |
| `bun run scripts/validate.ts plugins/my-plugin` | Validate a specific plugin |
| `bun run scripts/generate-lock.ts` | Regenerate `marketplace.lock` from `plugins/` |
| `bun run scripts/validate-lock.ts` | Check lockfile consistency (warn mode) |
| `bun run scripts/validate-lock.ts --strict` | Check lockfile consistency (fail on mismatch) |
| `bun run scripts/generate-index.ts` | Regenerate `.claude-plugin/marketplace.json` from plugins |
| `bun run scripts/add-external.ts <repo-url> <path> [--name <name>]` | Vendor an external skill |
| `bun run scripts/sync-external.ts [--dry-run]` | Sync vendored external skills with upstream |

**After adding/modifying plugins:** run `validate.ts` then `generate-lock.ts`.

## Architecture

```
plugins/                    # All plugins live here
  <plugin-name>/
    plugin.json             # Plugin metadata (required)
    skills/                 # Skills directory (required, at least one skill)
      <skill-name>/
        SKILL.md            # Skill definition with YAML frontmatter (required)
        examples/           # Optional example files
        references/         # Optional supplementary docs
    agents/                 # Optional agent definitions
    commands/               # Optional command definitions
  external/                 # Vendored external skills
    <org>/<repo>/
      .source.json          # Tracks origin URL, SHA, synced timestamp
      skills/
schemas/                    # JSON Schema definitions
  skill-frontmatter.schema.json
  marketplace-lock.schema.json
scripts/                    # Bun + Effect TS tooling
  lib/
    types.ts                # All TypeScript interfaces
    errors.ts               # Tagged error types (Data.TaggedError)
    filesystem.ts           # Shared filesystem operations
  validate.ts               # Plugin structure validator
  generate-lock.ts          # Lockfile generator
  validate-lock.ts          # Lockfile consistency checker
  generate-index.ts         # Marketplace index generator
  add-external.ts           # External skill importer
  sync-external.ts          # External skill updater
```

## Plugin Conventions

### Naming
- Plugin and skill names: **kebab-case** (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`)
- Versions: **semver** (`x.y.z`, e.g. `1.0.0`)
- No special characters or spaces

### plugin.json Required Fields
```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "What this plugin does",
  "author": { "name": "Author Name" },
  "category": "utilities"
}
```

Valid categories: `utilities` (only one currently).

### SKILL.md Frontmatter Required Fields
```yaml
---
name: my-skill
description: |
  Use this skill when the user asks to "do X", "perform Y",
  or mentions related keywords.
version: 0.1.0
---
```

Required: `name`, `description`, `version`. Optional: `license`, `compatibility`, `metadata`.

### Validation Rules (what `validate.ts` enforces)
1. Each plugin directory must have a `plugin.json`
2. Each plugin must have a `skills/` directory with at least one skill
3. Each skill directory must contain a `SKILL.md` with valid YAML frontmatter
4. Names must be kebab-case, versions must be semver
5. Skill names must be globally unique across all plugins
6. `plugin.json` must include: `name`, `version`, `description`, `author.name`, `category`
7. `category` must be one of the valid category IDs

### Lockfile
`marketplace.lock` tracks all skills. Internal skills are marked `"internal"`, external vendored skills include `origin` URL and `sha`. CI validates lockfile consistency in strict mode.

## Code Patterns

Scripts use **Effect TS** with `@effect/platform-bun`:
- Generator syntax: `Effect.gen(function* () { ... })`
- Services via `yield*`: `const fs = yield* FileSystem.FileSystem`
- Tagged errors: `Data.TaggedError` for typed error handling
- State via `Ref`: `Ref.make`, `Ref.get`, `Ref.update` (no mutable globals)
- Program entry: `BunRuntime.runMain(main.pipe(Effect.provide(BunContext.layer)))`

## CI

Two GitHub Actions workflows:

**Validate Skills** (`validate.yml`) — runs on PRs and pushes to `main` when `plugins/`, `templates/`, `scripts/`, `schemas/`, or `marketplace.lock` change:
1. `bun run scripts/validate.ts` — plugin structure validation
2. `bun run scripts/validate-lock.ts --strict` — lockfile consistency
3. JSON schema syntax check on `schemas/*.schema.json`

**Sync External Skills** (`sync-external.yml`) — weekly cron (Monday 6am UTC) or manual dispatch:
- Pulls latest from external skill sources
- Opens a PR if changes detected
