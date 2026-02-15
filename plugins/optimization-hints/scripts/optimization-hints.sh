#!/bin/bash
set -euo pipefail

# jq is required to parse hook input
command -v jq &>/dev/null || exit 0

input=$(cat)

transcript_path=$(jq -r '.transcript_path // ""' <<< "$input")
user_prompt=$(jq -r '.prompt // ""' <<< "$input")

# Skip if missing data
[[ -z "$transcript_path" || -z "$user_prompt" ]] && exit 0

# Skip exploratory prompts (question-word prefixes)
prompt_lower=$(printf '%s' "$user_prompt" | tr '[:upper:]' '[:lower:]')
if [[ "$prompt_lower" =~ ^(what|how|where|why|when|which|who|can\ you|is\ there|show|tell|explain|describe) ]]; then
  exit 0
fi

# Skip discovery-verb prompts
if [[ "$prompt_lower" =~ (search|find|explore|investigate|look\ for|look\ at|browse|scan|discover|locate) ]]; then
  exit 0
fi

# Skip if transcript doesn't exist
[[ ! -f "$transcript_path" ]] && exit 0

# Count tool calls (cap at last 1000 lines for long sessions)
tool_count=$(tail -n 1000 "$transcript_path" 2>/dev/null | grep -c '"type":"tool_use"' || echo "0")
[[ "$tool_count" -lt 8 ]] && exit 0

# Hint pool — agent-directed workflow tips
hints=(
  "Tip: Batch independent Read, Grep, and Glob calls in a single response — parallel tool calls are 3-5x faster than sequential."
  "Tip: If you keep reading the same files each session, add key paths to the project CLAUDE.md so they load automatically."
  "Tip: When correcting the same behavior repeatedly, add a specific instruction to CLAUDE.md to prevent it permanently."
  "Tip: When a prompt requires 10+ tool calls, split it into focused sub-tasks — smaller tasks finish faster with fewer errors."
  "Tip: For multi-step workflows you repeat across sessions, create a reusable skill in ~/.claude/skills/ to encode the pattern once."
  "Tip: For complex multi-file changes, use the Task tool to dispatch parallel subagents instead of sequential edits."
  "Tip: If you run the same validation after every edit, a PostToolUse hook can automate it — no manual re-running needed."
  "Tip: Use /memory to persist insights across sessions so they don't need to be rediscovered each time."
  "Tip: Prefer grepika MCP tools (search, refs, outline) over Grep/Glob for code search — trigram-indexed search is faster and more token-efficient. Use Read over cat, Glob over find."
  "Tip: Use @file references in prompts to inject file content directly instead of asking the agent to search for it."
  "Tip: Use Edit with minimal surrounding context rather than Write for full file rewrites — it's safer and faster."
  "Tip: For broad codebase exploration, delegate to a Task agent with subagent_type=Explore instead of running many Grep/Glob calls yourself."
)

hint_index=$((tool_count % ${#hints[@]}))
jq -n --arg ctx "${hints[$hint_index]}" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$ctx}}'
exit 0
