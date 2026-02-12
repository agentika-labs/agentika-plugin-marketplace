#!/usr/bin/env bash
# journal-cleanup.sh - Rolling window trim + JOURNAL.md regeneration
# Called by on-session-start.sh and on-stop.sh

source "$(dirname "$0")/common.sh"

if [[ "$HAS_JQ" != "true" ]]; then
  exit 0
fi

if [[ ! -f "$ENTRIES_FILE" ]]; then
  exit 0
fi

# --- Step 1: Trim old entries (7 days, 500 cap) ---
cutoff=$(cutoff_7d)
tmp="${ENTRIES_FILE}.tmp.$$"

acquire_lock
# Filter entries newer than cutoff, cap at 500
jq -c --arg cutoff "$cutoff" 'select(.timestamp >= $cutoff)' "$ENTRIES_FILE" | tail -n 500 > "$tmp"
mv "$tmp" "$ENTRIES_FILE"  # Atomic rename (Rule 3)
release_lock

# --- Step 2: Generate JOURNAL.md ---
journal_file="$JOURNAL_DIR/JOURNAL.md"
journal_tmp="${journal_file}.tmp.$$"

{
  echo "# Change Journal"
  echo "Last updated: $(now_iso)"
  echo ""
  echo "## Recent Sessions"
  echo ""

  # Extract last 20 session summaries (newest first)
  summaries=$(jq -c 'select(.type == "session_summary")' "$ENTRIES_FILE" | tail -20 | tac)

  if [[ -z "$summaries" ]]; then
    echo "_No session summaries yet._"
  else
    while IFS= read -r summary; do
      timestamp=$(printf '%s' "$summary" | jq -r '.timestamp')
      session_id=$(printf '%s' "$summary" | jq -r '.session_id')
      workspace=$(printf '%s' "$summary" | jq -r '.workspace')
      intent=$(printf '%s' "$summary" | jq -r '.intent // "No intent captured"')
      diff_stat=$(printf '%s' "$summary" | jq -r '.diff_stat // ""')
      file_count=$(printf '%s' "$summary" | jq -r '.file_count // 0')

      # Format header
      short_id="${session_id:0:8}"
      date_part="${timestamp:0:10} ${timestamp:11:5}"

      echo "### $date_part ($short_id) [$workspace]"
      echo "**Task**: $intent"

      if [[ -n "$diff_stat" && "$diff_stat" != "null" ]]; then
        echo "**Files** ($file_count): $diff_stat"
      fi

      # Get file changes for this session, deduplicated (last change per file)
      file_changes=$(jq -c --arg sid "$session_id" \
        'select(.type == "file_change" and .session_id == $sid)' "$ENTRIES_FILE" | \
        jq -c -s 'group_by(.file_path) | map(last) | .[]' 2>/dev/null) || true

      if [[ -n "$file_changes" ]]; then
        while IFS= read -r change; do
          fp=$(printf '%s' "$change" | jq -r '.file_path')
          action=$(printf '%s' "$change" | jq -r '.action')
          la=$(printf '%s' "$change" | jq -r '.lines_added // 0')
          lr=$(printf '%s' "$change" | jq -r '.lines_removed // 0')
          preview=$(printf '%s' "$change" | jq -r '.change_preview // "" | .[0:80]')

          if [[ -n "$preview" && "$preview" != "null" ]]; then
            # Collapse newlines for inline display
            preview=$(printf '%s' "$preview" | tr '\n' ' ' | sed 's/  */ /g')
            echo "- $fp ($action, +$la -$lr): \`$preview\`"
          else
            echo "- $fp ($action, +$la -$lr)"
          fi
        done <<< "$file_changes"
      fi

      echo ""
    done <<< "$summaries"
  fi

  # Active workspaces section
  echo "---"
  echo ""
  echo "## Active Workspaces"

  workspaces=$(jq -r 'select(.type == "session_summary") | .workspace' "$ENTRIES_FILE" | sort -u) || true
  if [[ -n "$workspaces" ]]; then
    while IFS= read -r ws; do
      last_active=$(jq -r --arg ws "$ws" \
        'select(.type == "session_summary" and .workspace == $ws) | .timestamp' "$ENTRIES_FILE" | \
        tail -1)
      session_count=$(jq -r --arg ws "$ws" \
        'select(.type == "session_summary" and .workspace == $ws)' "$ENTRIES_FILE" | wc -l | tr -d ' ')
      echo "- $ws: Last active ${last_active:-unknown} ($session_count sessions)"
    done <<< "$workspaces"
  else
    echo "_No workspace activity recorded yet._"
  fi
} | head -200 > "$journal_tmp"
mv "$journal_tmp" "$journal_file"

# --- Step 3: Generate summary.txt (compact summary for SubagentStart) ---
summary_file="$JOURNAL_DIR/summary.txt"
summary_tmp="${summary_file}.tmp.$$"

{
  # Last 5 session summaries, one line each
  jq -c 'select(.type == "session_summary")' "$ENTRIES_FILE" | tail -5 | tac | while IFS= read -r summary; do
    workspace=$(printf '%s' "$summary" | jq -r '.workspace')
    intent=$(printf '%s' "$summary" | jq -r '.intent // "No intent captured" | .[0:100]')
    files=$(printf '%s' "$summary" | jq -r '.files_changed // [] | join(", ") | .[0:100]')
    echo "- [$workspace] $intent ($files)"
  done
} > "$summary_tmp"
mv "$summary_tmp" "$summary_file"
