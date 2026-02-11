# Installation Methods

## CLI Installation (npx)

Install plugins directly from the marketplace:

```bash
npx add-skill agentika-labs/agentika-plugin-marketplace/plugins/<plugin-name>
```

Example:

```bash
npx add-skill agentika-labs/agentika-plugin-marketplace/plugins/grepika
```

This installs the plugin to `~/.claude/skills/` for persistent access.

## Manual Installation

Copy the plugin directory to your Claude skills folder:

```bash
# Clone the marketplace
git clone https://github.com/agentika-labs/agentika-plugin-marketplace.git
cd agentika-plugin-marketplace

# Copy a specific plugin
cp -r plugins/grepika ~/.claude/skills/
```

## Session-Only Installation

Use a plugin for a single session without permanent installation:

```bash
# From the marketplace directory
claude --plugin-dir ./plugins/grepika

# Or specify an absolute path
claude --plugin-dir /path/to/plugin
```

## Project-Level Installation

Include plugins directly in your project for team sharing:

```bash
# Create a skills directory in your project
mkdir -p .claude/skills

# Copy the plugin
cp -r /path/to/marketplace/plugins/plugin-name .claude/skills/
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
npx add-skill agentika-labs/agentika-plugin-marketplace/plugins/<plugin-name> --force
```

### Manually Installed Plugins

```bash
# Remove the old version
rm -rf ~/.claude/skills/<plugin-name>

# Install the new version
cp -r plugins/<plugin-name> ~/.claude/skills/
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
