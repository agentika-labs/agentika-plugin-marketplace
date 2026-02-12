#!/usr/bin/env bash
# on-file-change.sh - Record Edit/Write events with change previews
# Hook: PostToolUse (async), matcher: Edit|Write

source "$(dirname "$0")/common.sh"

if [[ "$HAS_JQ" != "true" ]]; then
  exit 0
fi

# Read hook input from stdin
input=$(cat)

tool_name=$(printf '%s' "$input" | jq -r '.tool_name // empty')
if [[ -z "$tool_name" ]]; then
  exit 0
fi

timestamp=$(now_iso)
session_id=$(get_session_id "$input")
vcs=$(detect_vcs)
workspace=$(detect_workspace "$vcs")

case "$tool_name" in
  Edit)
    # Build entry entirely in jq (Rule 1: no shell interpolation into JSON)
    # Binary check: look for null bytes in old_string/new_string
    has_binary=$(printf '%s' "$input" | jq -r '
      [.tool_input.old_string // "", .tool_input.new_string // ""] |
      any(test("\\u0000"))
    ' 2>/dev/null) || has_binary="false"

    if [[ "$has_binary" == "true" ]]; then
      preview_override="[binary content]"
    else
      preview_override=""
    fi

    entry=$(printf '%s' "$input" | jq -c \
      --arg type "file_change" \
      --arg timestamp "$timestamp" \
      --arg session_id "$session_id" \
      --arg workspace "$workspace" \
      --arg vcs "$vcs" \
      --arg action "edit" \
      --arg project_dir "$CLAUDE_PROJECT_DIR" \
      --arg preview_override "$preview_override" \
      '{
        type: $type,
        timestamp: $timestamp,
        session_id: $session_id,
        workspace: $workspace,
        vcs: $vcs,
        file_path: (.tool_input.file_path | ltrimstr($project_dir) | ltrimstr("/")),
        action: $action,
        change_preview: (
          if $preview_override != "" then $preview_override
          else ("- " + ((.tool_input.old_string // "")[0:200]) + "\n+ " + ((.tool_input.new_string // "")[0:200]))
          end
        ),
        lines_added: ((.tool_input.new_string // "") | split("\n") | length),
        lines_removed: ((.tool_input.old_string // "") | split("\n") | length)
      }')
    ;;
  Write)
    entry=$(printf '%s' "$input" | jq -c \
      --arg type "file_change" \
      --arg timestamp "$timestamp" \
      --arg session_id "$session_id" \
      --arg workspace "$workspace" \
      --arg vcs "$vcs" \
      --arg action "write" \
      --arg project_dir "$CLAUDE_PROJECT_DIR" \
      '{
        type: $type,
        timestamp: $timestamp,
        session_id: $session_id,
        workspace: $workspace,
        vcs: $vcs,
        file_path: (.tool_input.file_path | ltrimstr($project_dir) | ltrimstr("/")),
        action: $action,
        change_preview: (.tool_input.content // "")[0:200],
        lines_added: ((.tool_input.content // "") | split("\n") | length),
        lines_removed: 0
      }')
    ;;
  *)
    exit 0
    ;;
esac

if [[ -n "${entry:-}" ]]; then
  append_entry "$entry"
fi
