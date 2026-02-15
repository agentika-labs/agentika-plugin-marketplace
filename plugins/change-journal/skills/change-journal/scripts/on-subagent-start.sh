#!/usr/bin/env bash
# on-subagent-start.sh - Inject recent changes into subagent context
# Hook: SubagentStart (sync, no matcher -- matches all agent types)

source "$(dirname "$0")/common.sh"

if [[ "$HAS_JQ" != "true" ]]; then
  exit 0
fi

# Exit silently if no journal exists
if [[ ! -d "$JOURNAL_DIR" ]]; then
  exit 0
fi

summary_file="$JOURNAL_DIR/summary.txt"
if [[ ! -f "$summary_file" ]]; then
  exit 0
fi

# Read hook input for session context
input=$(cat)
session_id=$(get_session_id "$input")

# Build compact summary from pre-computed summary.txt
context="[Change Journal] Recent activity in this project:"$'\n'
context+=$(cat "$summary_file")

# Append current session's file changes (lightweight grep + jq)
if [[ -f "$ENTRIES_FILE" && -n "$session_id" ]]; then
  current_changes=$(jq -r --arg sid "$session_id" \
    'select(.session_id == $sid and .type == "file_change") | "\(.file_path) (\(.action))"' \
    "$ENTRIES_FILE" 2>/dev/null | sort -u | paste -sd ", " -) || true

  if [[ -n "$current_changes" ]]; then
    context+=$'\n'"Current session changes: $current_changes"
  fi
fi

context+=$'\n'"Use /change-journal for detailed history."

output_additional_context "SubagentStart" "$context"
