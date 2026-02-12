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

ensure_journal_dir

# Run cleanup to trim old entries and regenerate JOURNAL.md
if [[ -f "$ENTRIES_FILE" ]]; then
  "$(dirname "$0")/journal-cleanup.sh"
fi

# Load JOURNAL.md into context
journal_file="$JOURNAL_DIR/JOURNAL.md"
if [[ -f "$journal_file" ]]; then
  output_additional_context "SessionStart" "$(cat "$journal_file")"
fi
