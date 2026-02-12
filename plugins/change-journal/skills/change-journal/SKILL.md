---
name: change-journal
description: |
  Query the change journal for cross-session and cross-workspace change history.
  Use when you need to understand what other agents changed, what happened in prior
  sessions, or to investigate changes to specific files.
  Invoke when the user says "what changed", "show changes", "change history",
  "what did agent X do", "what was modified", "change journal", "change log",
  "recent changes", or "who changed [file]".
version: 0.1.0
allowed-tools:
  - Bash
  - Read
  - Grep
---

# Change Journal

Query the project's change journal for cross-session and cross-workspace awareness.

## Journal Location

All journal data lives in `$CLAUDE_PROJECT_DIR/.claude/journal/`:
- **`JOURNAL.md`** — Human-readable rolling summary (quick overview)
- **`entries.jsonl`** — Structured entries (one JSON per line, for filtering)
- **`summary.txt`** — Compact summary (auto-injected into subagents)

## Quick Start

Read the journal summary for a quick overview:

```bash
cat "$CLAUDE_PROJECT_DIR/.claude/journal/JOURNAL.md"
```

## Query Patterns

### Filter by workspace
```bash
jq 'select(.workspace == "agent-1")' "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl"
```

### Filter by file path
```bash
jq 'select(.file_path | contains("auth"))' "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl"
```

### Filter by time range
```bash
jq 'select(.timestamp >= "2026-02-12")' "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl"
```

### Most frequently changed files
```bash
grep file_change "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl" | jq -r .file_path | sort | uniq -c | sort -rn
```

### Full diff for a specific session
```bash
jq -r 'select(.session_id == "SESSION_ID" and .type == "session_summary") | .diff_preview' "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl"
```

### What are other agents/workspaces working on?
```bash
jq 'select(.type == "session_summary")' "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl" | jq -r '"\(.workspace): \(.intent)"'
```

### Changes from a specific workspace
```bash
jq 'select(.workspace == "WORKSPACE" and .type == "file_change")' "$CLAUDE_PROJECT_DIR/.claude/journal/entries.jsonl"
```

## Entry Types

### file_change
Recorded per Edit/Write operation. Fields: `timestamp`, `session_id`, `workspace`, `vcs`, `file_path`, `action` (edit/write), `change_preview`, `lines_added`, `lines_removed`.

### session_summary
One per session (on stop). Fields: `timestamp`, `session_id`, `workspace`, `vcs`, `intent` (extracted from user's first message), `file_count`, `files_changed`, `diff_stat`, `diff_preview`.

### subagent_work
Tracks subagent completions. Fields: `timestamp`, `session_id`, `agent_id`, `agent_type`, `workspace`.
