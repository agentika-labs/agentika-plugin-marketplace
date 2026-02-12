# Change Journal

Automatically track file changes across Claude Code sessions for cross-workspace awareness.

Every Edit and Write gets logged. Session summaries capture intent and VCS diffs. Subagents receive change context automatically. No configuration needed.

## Prerequisites

- **bash** (macOS/Linux)
- **jq** (required for all journal operations)

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq
```

## Installation

After adding the plugin to your Claude Code project, **make the hook scripts executable**:

```bash
chmod +x plugins/change-journal/hooks/scripts/*.sh
```

Without this step, the hooks will silently fail and nothing will be tracked.

## How it works

The plugin hooks into Claude Code's lifecycle events. Nothing to invoke. Everything runs automatically.

### Tracking changes

The **PostToolUse** hook fires after every `Edit` or `Write` tool call (async, so it doesn't slow down the agent). Each change is recorded as a `file_change` entry in `entries.jsonl` with the file path, action type, a change preview, and line counts.

### Session summaries

The **Stop** hook fires when a session ends. It extracts the user's intent from the first message in the transcript, collects all files changed during the session, and captures a VCS diff (scoped to those files only). This becomes a `session_summary` entry.

### Context injection

- **SessionStart** loads `JOURNAL.md` (a rolling summary of past sessions) into the agent's context
- **SubagentStart** injects `summary.txt` plus the current session's changes, so subagents know what's been happening

### Cleanup

On each session start, `journal-cleanup.sh` trims entries older than 7 days and regenerates both `JOURNAL.md` and `summary.txt`.

## Storage

All data lives in `.claude/journal/` inside your project directory:

| File | Purpose |
|------|---------|
| `entries.jsonl` | Structured log, one JSON object per line |
| `JOURNAL.md` | Human-readable rolling summary (injected on session start) |
| `summary.txt` | Compact summary (injected into subagents) |
| `entries.lock/` | Directory-based lock for concurrent write safety |

The journal directory is created automatically on first use.

## Querying

Use the `/change-journal` skill for guided queries. It has jq patterns for filtering by workspace, file path, time range, and more.

Quick examples:

```bash
# Read the rolling summary
cat .claude/journal/JOURNAL.md

# Recent file changes
jq 'select(.type == "file_change")' .claude/journal/entries.jsonl | tail -20

# What are other workspaces working on?
jq -r 'select(.type == "session_summary") | "\(.workspace): \(.intent)"' .claude/journal/entries.jsonl
```

## Hook reference

| Hook | Event | Mode | What It Does |
|------|-------|------|-------------|
| `on-session-start.sh` | SessionStart | sync | Runs cleanup, loads JOURNAL.md into context |
| `on-file-change.sh` | PostToolUse (Edit/Write) | async | Records file change entry |
| `on-stop.sh` | Stop | sync | Creates session summary with intent + diff |
| `on-subagent-start.sh` | SubagentStart | sync | Injects summary.txt into subagent context |
| `on-subagent-stop.sh` | SubagentStop | async | Records subagent completion |

Supporting scripts:

| Script | Purpose |
|--------|---------|
| `common.sh` | Shared helpers: VCS detection, locking, JSON output |
| `journal-cleanup.sh` | Trims entries older than 7 days, regenerates summaries |

## VCS support

The plugin auto-detects your version control system in priority order:

1. **JJ (Jujutsu)** if available (preferred)
2. **Git** as fallback
3. **None**: works without VCS, but no diff capture

VCS is used for diff stats and previews in session summaries. File change tracking works regardless of VCS.
