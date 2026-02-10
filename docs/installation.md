# Installation Methods

## Using oc.sh (Recommended for OpenCode)

The `oc.sh` script provides a simple way to install skills from the marketplace:

```bash
# Clone the marketplace
git clone https://github.com/agentika/plugin-marketplace.git
cd plugin-marketplace

# List available skills
./oc.sh list

# Install a skill
./oc.sh install stripe-checkout

# Install external skill with SHA pin
./oc.sh install github.com/anthropics/claude-skills@abc1234

# List installed skills
./oc.sh installed

# Uninstall a skill
./oc.sh uninstall stripe-checkout
```

### Install Locations

By default, `oc.sh` installs to:
- **Project-level:** `.claude/skills/` (if `.claude/` exists in current or parent directory)
- **User-level:** `~/.claude/skills/` (fallback)

Use `--user` to force user-level installation:

```bash
./oc.sh install stripe-checkout --user
```

### Team Verification

Verify installed skills match the lockfile:

```bash
./oc.sh verify           # Warn on mismatches
./oc.sh verify --strict  # Fail on mismatches (for CI)
```

See [Team Enforcement](team-enforcement.md) for lockfile details.

## CLI Installation (npx)

Install plugins directly from the marketplace:

```bash
npx add-skill agentika/plugin-marketplace/plugins/<category>/<plugin-name>
```

Example:

```bash
npx add-skill agentika/plugin-marketplace/plugins/api-services/stripe-payments
```

This installs the plugin to `~/.claude/skills/` for persistent access.

## Manual Installation

Copy the plugin directory to your Claude skills folder:

```bash
# Clone the marketplace
git clone https://github.com/agentika/plugin-marketplace.git
cd plugin-marketplace

# Copy a specific plugin
cp -r plugins/api-services/stripe-payments ~/.claude/skills/
```

## Session-Only Installation

Use a plugin for a single session without permanent installation:

```bash
# From the marketplace directory
claude --plugin-dir ./plugins/api-services/stripe-payments

# Or specify an absolute path
claude --plugin-dir /path/to/plugin
```

## Project-Level Installation

Include plugins directly in your project for team sharing:

```bash
# Create a skills directory in your project
mkdir -p .claude/skills

# Copy the plugin
cp -r /path/to/marketplace/plugins/category/plugin-name .claude/skills/
```

Add to `.gitignore` if the plugin contains sensitive configurations:

```
.claude/skills/*/config.local.json
```

## Verifying Installation

After installation, verify the plugin is available:

```bash
# List installed skills
claude --list-skills

# Or start Claude and ask it to describe available skills
```

## Updating Plugins

### CLI-Installed Plugins

```bash
npx add-skill agentika/plugin-marketplace/plugins/<category>/<plugin-name> --force
```

### Manually Installed Plugins

```bash
# Remove the old version
rm -rf ~/.claude/skills/<plugin-name>

# Install the new version
cp -r plugins/<category>/<plugin-name> ~/.claude/skills/
```

## Uninstalling

```bash
rm -rf ~/.claude/skills/<plugin-name>
```

## Troubleshooting

### Plugin Not Found

1. Check the plugin path is correct
2. Ensure the plugin has a valid `plugin.json`
3. Verify SKILL.md files are present in the skills directory

### Skill Not Triggering

1. Check the SKILL.md description matches your prompt
2. Try using explicit trigger phrases from the skill description
3. Verify environment variables are set correctly
