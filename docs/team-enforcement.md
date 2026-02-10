# Team Enforcement

The marketplace includes a lockfile system for teams that need to enforce approved skills across developers.

## Overview

The `marketplace.lock` file tracks all approved skills:
- **Internal skills** from the marketplace
- **External skills** with pinned SHAs

This enables:
- Reproducible builds with known skill versions
- Security reviews before new skills are approved
- CI/CD verification of skill consistency

## Lockfile Format

```json
{
  "version": 1,
  "generated": "2026-02-04T10:00:00.000Z",
  "skills": {
    "plugins/grepika/skills/index": "internal",
    "plugins/external/anthropics/claude-skills/skills/code-review": {
      "origin": "https://github.com/anthropics/claude-skills.git",
      "sha": "abc1234"
    }
  }
}
```

### Fields

| Field | Description |
|-------|-------------|
| `version` | Lockfile format version |
| `generated` | ISO 8601 timestamp of last generation |
| `skills` | Map of skill paths to source info |

### Skill Entries

- **Internal:** `"internal"` - Skill is part of the marketplace
- **External:** `{ origin, sha }` - Vendored from external repo with SHA pin

## Usage

### Generating the Lockfile

```bash
# Generate lockfile from current plugins
bun run scripts/generate-lock.ts
```

### Validating the Lockfile

```bash
# Warn on mismatches (default)
bun run scripts/validate-lock.ts

# Fail on mismatches (for CI)
bun run scripts/validate-lock.ts --strict
```

### Using oc.sh

```bash
# Verify installed skills match lockfile
./oc.sh verify

# Strict mode for CI
./oc.sh verify --strict
```

## CI Integration

Add lockfile validation to your CI pipeline:

```yaml
# .github/workflows/validate.yml
name: Validate Skills

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run scripts/validate.ts
      - run: bun run scripts/validate-lock.ts --strict
```

## External Skills

### Adding External Skills

```bash
# Add a skill from an external repo
bun run scripts/add-external.ts https://github.com/anthropics/claude-skills skills/code-review

# Update the lockfile
bun run scripts/generate-lock.ts
```

### Syncing External Skills

External skills can be automatically synced with their source repositories:

```bash
# Preview updates
bun run scripts/sync-external.ts --dry-run

# Apply updates
bun run scripts/sync-external.ts
bun run scripts/generate-lock.ts
```

The marketplace includes a GitHub Actions workflow that runs weekly to sync external skills and create a PR with any updates.

## Workflow

### Initial Setup

1. Generate the initial lockfile:
   ```bash
   bun run scripts/generate-lock.ts
   ```

2. Commit the lockfile:
   ```bash
   git add marketplace.lock
   git commit -m "chore: add skill lockfile"
   ```

3. Enable CI validation (see CI Integration above)

### Adding a New Skill

1. Add the skill to `plugins/`
2. Regenerate the lockfile:
   ```bash
   bun run scripts/generate-lock.ts
   ```
3. Commit both the skill and updated lockfile
4. CI validates the lockfile matches

### Reviewing Skill Updates

1. Weekly sync workflow creates a PR with external updates
2. Review the changed files and updated SHAs
3. Test affected skills if needed
4. Merge to approve the updates

## Security Considerations

### SHA Pinning

External skills are always pinned to a specific commit SHA:
- Prevents unexpected changes from upstream
- Enables security review before updates
- Provides reproducible builds

### Review Process

We recommend:
1. Require PR approval for lockfile changes
2. Review skill code changes, not just SHA updates
3. Run security scans on vendored code
4. Test skills before approving updates

## Troubleshooting

### Lockfile Drift

If `validate-lock.ts` reports missing skills:

```bash
# Check what's different
bun run scripts/validate-lock.ts

# Regenerate the lockfile
bun run scripts/generate-lock.ts

# Review and commit changes
git diff marketplace.lock
```

### SHA Mismatch

If an external skill's SHA doesn't match:

1. Check if the source was manually modified
2. Run sync to get the latest version:
   ```bash
   bun run scripts/sync-external.ts
   bun run scripts/generate-lock.ts
   ```

## Related Documentation

- [Installation Methods](installation.md)
- [OpenCode Integration](opencode-integration.md)
- [Skill Format Specification](skill-format.md)
