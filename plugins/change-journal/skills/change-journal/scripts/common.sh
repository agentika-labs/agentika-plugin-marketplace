#!/usr/bin/env bash
# common.sh - Shared helpers for change-journal hooks
# Source this file from hook scripts: source "$(dirname "$0")/common.sh"

set -euo pipefail

# --- Guards ---
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
  exit 0
fi

# --- Dependencies ---
HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
fi

# --- Paths ---
CLAUDE_PROJECTS_SLUG=$(printf '%s' "$CLAUDE_PROJECT_DIR" | tr '/' '-')
CLAUDE_PROJECTS_DIR="$HOME/.claude/projects/$CLAUDE_PROJECTS_SLUG"
JOURNAL_DIR="$CLAUDE_PROJECTS_DIR/journal"
ENTRIES_FILE="$JOURNAL_DIR/entries.jsonl"
LOCK_DIR="$JOURNAL_DIR/entries.lock"

# --- Session ID ---
# Extract session ID from hook input JSON, env var, or generate fallback
get_session_id() {
  local input="${1:-}"
  local sid=""
  if [[ -n "$input" && "$HAS_JQ" == "true" ]]; then
    sid=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null) || true
  fi
  if [[ -z "$sid" ]]; then
    sid="${CLAUDE_SESSION_ID:-}"
  fi
  if [[ -z "$sid" ]]; then
    sid="s-$(date +%s)"
  fi
  echo "$sid"
}

# --- VCS Detection ---
detect_vcs() {
  if command -v jj &>/dev/null && jj root &>/dev/null 2>&1; then
    echo "jj"
  elif command -v git &>/dev/null && git rev-parse --git-dir &>/dev/null 2>&1; then
    echo "git"
  else
    echo "none"
  fi
}

detect_workspace() {
  # TODO: differentiate by VCS (e.g. jj workspace name vs git worktree) in a future version
  basename "$CLAUDE_PROJECT_DIR"
}

# --- VCS Operations ---
get_diff_stat() {
  local vcs="$1"
  shift
  local files=("$@")
  case "$vcs" in
    jj)
      if [[ ${#files[@]} -gt 0 ]]; then
        jj diff --stat -- "${files[@]}" 2>/dev/null || true
      else
        jj diff --stat 2>/dev/null || true
      fi
      ;;
    git)
      if [[ ${#files[@]} -gt 0 ]]; then
        git diff --stat HEAD -- "${files[@]}" 2>/dev/null || true
      else
        git diff --stat HEAD 2>/dev/null || true
      fi
      ;;
    *)
      echo ""
      ;;
  esac
}

get_diff_preview() {
  local vcs="$1"
  local max_lines="${2:-80}"
  shift 2
  local files=("$@")
  case "$vcs" in
    jj)
      if [[ ${#files[@]} -gt 0 ]]; then
        jj diff -- "${files[@]}" 2>/dev/null | head -n "$max_lines" || true
      else
        jj diff 2>/dev/null | head -n "$max_lines" || true
      fi
      ;;
    git)
      if [[ ${#files[@]} -gt 0 ]]; then
        git diff HEAD -- "${files[@]}" 2>/dev/null | head -n "$max_lines" || true
      else
        git diff HEAD 2>/dev/null | head -n "$max_lines" || true
      fi
      ;;
    *)
      echo ""
      ;;
  esac
}

# --- Timestamps ---
now_iso() {
  date -u +%Y-%m-%dT%H:%M:%S.000Z
}

cutoff_7d() {
  if date -v-7d +%s &>/dev/null 2>&1; then
    date -u -v-7d +%Y-%m-%dT%H:%M:%S.000Z  # macOS
  else
    date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S.000Z  # Linux
  fi
}

# --- Journal I/O ---
ensure_journal_dir() {
  mkdir -p "$JOURNAL_DIR"
}

acquire_lock() {
  local max_wait=5
  local waited=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    sleep 0.05
    waited=$((waited + 1))
    if [[ $waited -ge $((max_wait * 20)) ]]; then
      # Stale lock -- remove and retry
      rmdir "$LOCK_DIR" 2>/dev/null || true
      mkdir "$LOCK_DIR" 2>/dev/null && break
    fi
  done
}

release_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

append_entry() {
  local json="$1"
  ensure_journal_dir
  acquire_lock
  echo "$json" >> "$ENTRIES_FILE"
  release_lock
}

# --- Output ---
output_additional_context() {
  local event_name="$1"
  local text="$2"
  local escaped
  escaped=$(printf '%s' "$text" | jq -Rs '.')
  printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":%s}}\n' "$event_name" "$escaped"
}
