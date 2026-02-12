#!/usr/bin/env bash
# on-subagent-stop.sh - Track subagent completions
# Hook: SubagentStop (async)

source "$(dirname "$0")/common.sh"

if [[ "$HAS_JQ" != "true" ]]; then
  exit 0
fi

# Read hook input from stdin
input=$(cat)

timestamp=$(now_iso)
session_id=$(get_session_id "$input")
agent_id=$(printf '%s' "$input" | jq -r '.agent_id // empty' 2>/dev/null) || true
agent_type=$(printf '%s' "$input" | jq -r '.agent_type // empty' 2>/dev/null) || true
vcs=$(detect_vcs)
workspace=$(detect_workspace "$vcs")

entry=$(jq -n -c \
  --arg type "subagent_work" \
  --arg timestamp "$timestamp" \
  --arg session_id "$session_id" \
  --arg agent_id "${agent_id:-unknown}" \
  --arg agent_type "${agent_type:-unknown}" \
  --arg workspace "$workspace" \
  '{
    type: $type,
    timestamp: $timestamp,
    session_id: $session_id,
    agent_id: $agent_id,
    agent_type: $agent_type,
    workspace: $workspace
  }')

append_entry "$entry"
