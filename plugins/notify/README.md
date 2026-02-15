# Notify

macOS desktop notifications for Claude Code lifecycle events.

## Prerequisites

- **macOS**
- **terminal-notifier**: `brew install terminal-notifier`
- **Claude Desktop app** (optional — provides the notification icon via `com.anthropic.claudefordesktop`)

## Notifications

| Event | Message |
|-------|---------|
| **Notification** | "Claude needs your input" — fires when Claude is waiting for you |
| **Stop** | "Task verified and completed" — fires when a session ends |

Notifications use the system `frog` sound and appear with the Claude Desktop app icon.
