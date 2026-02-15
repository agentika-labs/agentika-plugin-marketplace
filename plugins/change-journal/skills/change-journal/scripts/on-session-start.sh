#!/usr/bin/env bash
# on-session-start.sh - Load JOURNAL.md into agent context
# Hook: SessionStart (sync), matchers: startup, resume

source "$(dirname "$0")/common.sh"

# Warn if jq is missing (not silent -- agents need to know)
if [[ "$HAS_JQ" != "true" ]]; then
  output_additional_context "SessionStart" \
    "[change-journal] WARNING: jq is required but not found. Install with: brew install jq (macOS) or apt install jq (Linux)"
  exit 0
fi

# --- Migrate from old location (one-time) ---
old_journal="$CLAUDE_PROJECT_DIR/.claude/journal"
if [[ -f "$old_journal/entries.jsonl" && ! -f "$ENTRIES_FILE" ]]; then
  ensure_journal_dir
  mv "$old_journal/entries.jsonl" "$JOURNAL_DIR/"
  mv "$old_journal/JOURNAL.md" "$JOURNAL_DIR/" 2>/dev/null || true
  mv "$old_journal/summary.txt" "$JOURNAL_DIR/" 2>/dev/null || true
  rmdir "$old_journal" 2>/dev/null || true
fi

ensure_journal_dir

# Export CHANGE_JOURNAL_DIR for skill scripts
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  echo "export CHANGE_JOURNAL_DIR=\"$JOURNAL_DIR\"" >> "$CLAUDE_ENV_FILE"
fi

# Run cleanup to trim old entries and regenerate JOURNAL.md
if [[ -f "$ENTRIES_FILE" ]]; then
  "$(dirname "$0")/journal-cleanup.sh"
fi

# Load JOURNAL.md into context
journal_file="$JOURNAL_DIR/JOURNAL.md"
if [[ -f "$journal_file" ]]; then
  output_additional_context "SessionStart" "$(cat "$journal_file")"
fi
