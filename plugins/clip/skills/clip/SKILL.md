---
name: clip
description: Copy clean text to clipboard without terminal formatting artifacts
version: 0.1.0
compatibility: "macOS only. Requires pbcopy (built-in on macOS)."
allowed-tools: Bash
argument-hint: "[code|text|command|all|plan]"
---

# Clip to Clipboard

Extracts content from the conversation and copies it to clipboard with clean formatting.

**Usage:**
- `/clip` or `/clip code` - Copy last code block
- `/clip text` - Copy last text response
- `/clip command` - Copy last bash command
- `/clip all` - Copy entire last response
- `/clip plan` - Copy most recent Claude Code plan

**How it works:**
1. You identify and extract the requested content type from recent conversation
2. Pass the extracted content to the cleaning script
3. Script removes ANSI codes, line numbers, and terminal artifacts
4. Clean content is copied to clipboard via pbcopy

## Instructions for Claude

Based on the `$ARGUMENTS` variable (default: "code"), extract the appropriate content:

- **"code"** (default): Find the last code block (between ``` markers) in your recent responses
- **"text"**: Extract the last text response (excluding code blocks and tool uses)
- **"command"**: Find the last Bash command from tool uses
- **"all"**: Extract the entire last assistant response
- **"plan"**: Copy the most recent Claude Code plan file from ~/.claude/plans/

### Extraction Process

1. **Identify the content** based on the argument type
2. **Extract the raw content** from your conversation context
3. **Pipe it to the cleaning script** using:
   ```bash
   echo "$content" | bash "${CLAUDE_PLUGIN_ROOT}/skills/clip/scripts/clean-copy.sh"
   ```

### Content Type Details

**For "code" (default):**
- Look for the most recent code block in your responses
- Extract text between ``` markers
- Include the code language if specified (e.g., ```python)
- If no code block found, inform the user

**For "text":**
- Extract the last text-only assistant response
- Exclude code blocks, tool calls, and tool results
- Include explanatory text and descriptions

**For "command":**
- Find the most recent Bash tool use
- Extract the command parameter value
- If no bash command found, inform the user

**For "all":**
- Extract your entire last response
- Include text, code blocks, and other content
- This is useful for copying complete explanations

**For "plan":**
- Read the most recent plan file from ~/.claude/plans/ directory
- Use: `cat $(ls -t ~/.claude/plans/*.md | head -1)`
- Pass the plan content directly to the cleaning script
- If no plan files found, inform the user

### Error Handling

If the requested content type is not found in recent conversation:
- Inform the user clearly what was requested
- Suggest alternatives (e.g., "No code blocks found. Try `/clip text` instead")
- Do not fail silently

### Example Workflow

```bash
# Extract the content (Claude does this internally)
content="function example() {
  console.log('hello');
}"

# Clean and copy to clipboard
echo "$content" | bash "${CLAUDE_PLUGIN_ROOT}/skills/clip/scripts/clean-copy.sh"
```

The cleaning script will handle:
- Removing ANSI escape codes
- Stripping line number prefixes
- Cleaning terminal artifacts
- Preserving indentation and formatting
- Copying to clipboard via pbcopy
