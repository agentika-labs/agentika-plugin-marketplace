#!/usr/bin/env bash
# on-stop.sh - Create session summary with intent + diff
# Hook: Stop (synchronous)

source "$(dirname "$0")/common.sh"

if [[ "$HAS_JQ" != "true" ]]; then
  exit 0
fi

# Read hook input from stdin
input=$(cat)

# Guard against stop hook loops
stop_active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null) || true
if [[ "$stop_active" == "true" ]]; then
  exit 0
fi

ensure_journal_dir

timestamp=$(now_iso)
session_id=$(get_session_id "$input")
vcs=$(detect_vcs)
workspace=$(detect_workspace "$vcs")

# --- Extract intent from transcript (Rule 6: streaming, no slurp) ---
transcript_path=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null) || true
intent="No intent captured"

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  extracted=$(jq -r 'select(.type == "human") | .content | if type == "string" then . elif type == "array" then (.[0].text // empty) else empty end' \
    "$transcript_path" 2>/dev/null | head -1 | head -c 200) || true
  if [[ -n "$extracted" ]]; then
    intent="$extracted"
  fi
fi

# --- Get this session's changed files ---
files_changed=()
if [[ -f "$ENTRIES_FILE" ]]; then
  while IFS= read -r fp; do
    [[ -n "$fp" ]] && files_changed+=("$fp")
  done < <(jq -r --arg sid "$session_id" \
    'select(.session_id == $sid and .type == "file_change") | .file_path' \
    "$ENTRIES_FILE" 2>/dev/null | sort -u)
fi

file_count=${#files_changed[@]}

# --- Get VCS diff (scoped to session files only) ---
diff_stat=""
diff_preview=""

if [[ $file_count -gt 0 ]]; then
  diff_stat=$(get_diff_stat "$vcs" "${files_changed[@]}")
  diff_preview=$(get_diff_preview "$vcs" 80 "${files_changed[@]}")
fi

# --- Build files_changed JSON array ---
files_json="[]"
if [[ $file_count -gt 0 ]]; then
  files_json=$(printf '%s\n' "${files_changed[@]}" | jq -R -s 'split("\n") | map(select(. != ""))')
fi

# --- Build session_summary entry (Rule 1: all JSON via jq --arg) ---
entry=$(jq -n -c \
  --arg type "session_summary" \
  --arg timestamp "$timestamp" \
  --arg session_id "$session_id" \
  --arg workspace "$workspace" \
  --arg vcs "$vcs" \
  --arg intent "$intent" \
  --argjson file_count "$file_count" \
  --argjson files_changed "$files_json" \
  --arg diff_stat "$diff_stat" \
  --arg diff_preview "$diff_preview" \
  '{
    type: $type,
    timestamp: $timestamp,
    session_id: $session_id,
    workspace: $workspace,
    vcs: $vcs,
    intent: $intent,
    file_count: $file_count,
    files_changed: $files_changed,
    diff_stat: $diff_stat,
    diff_preview: $diff_preview
  }')

append_entry "$entry"

# --- Regenerate JOURNAL.md and summary.txt ---
"$(dirname "$0")/journal-cleanup.sh"
