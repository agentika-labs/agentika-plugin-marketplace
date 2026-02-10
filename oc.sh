#!/usr/bin/env bash
# oc.sh - OpenCode/Claude Code skill installer
#
# Usage:
#   ./oc.sh install <skill-name>              Install from marketplace
#   ./oc.sh install <github-url>@<sha>        Install external with SHA pin
#   ./oc.sh uninstall <skill-name>            Remove installed skill
#   ./oc.sh list                              List available skills
#   ./oc.sh installed                         List installed skills
#   ./oc.sh verify [--strict]                 Verify against lockfile
#   ./oc.sh help                              Show this help
#
# Options:
#   --strict    Exit with error on verification failures
#   --user      Install to ~/.claude/skills instead of project

set -euo pipefail

# Colors (if terminal supports them)
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS_DIR="${SCRIPT_DIR}/plugins"
LOCKFILE="${SCRIPT_DIR}/marketplace.lock"

# Determine install directory
get_install_dir() {
  local force_user="${1:-false}"

  if [[ "$force_user" == "true" ]]; then
    echo "${HOME}/.claude/skills"
    return
  fi

  # Check for project-level .claude directory
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "${dir}/.claude" ]]; then
      echo "${dir}/.claude/skills"
      return
    fi
    dir="$(dirname "$dir")"
  done

  # Fall back to user-level
  echo "${HOME}/.claude/skills"
}

# Print error message
error() {
  echo -e "${RED}Error:${NC} $1" >&2
}

# Print success message
success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Print warning message
warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Print info message
info() {
  echo -e "${BLUE}→${NC} $1"
}

# Find skill in marketplace by name
find_skill() {
  local name="$1"
  local skill_path=""

  # Search plugins directory recursively
  while IFS= read -r -d '' skill_md; do
    local skill_dir="$(dirname "$skill_md")"
    local skill_name="$(basename "$skill_dir")"

    if [[ "$skill_name" == "$name" ]]; then
      skill_path="$skill_dir"
      break
    fi

    # Also check frontmatter name
    local frontmatter_name
    frontmatter_name=$(grep -m1 '^name:' "$skill_md" 2>/dev/null | sed 's/name:[[:space:]]*//' | tr -d '\r')
    if [[ "$frontmatter_name" == "$name" ]]; then
      skill_path="$skill_dir"
      break
    fi
  done < <(find "$PLUGINS_DIR" -name "SKILL.md" -print0 2>/dev/null)

  echo "$skill_path"
}

# Parse GitHub URL and SHA
parse_external_ref() {
  local ref="$1"

  # Format: github.com/org/repo@sha or https://github.com/org/repo@sha
  if [[ "$ref" =~ ^(https?://)?github\.com/([^/]+)/([^@]+)@([a-f0-9]+)$ ]]; then
    echo "https://github.com/${BASH_REMATCH[2]}/${BASH_REMATCH[3]}.git"
    echo "${BASH_REMATCH[4]}"
    return 0
  fi

  return 1
}

# Install a skill
cmd_install() {
  local target="$1"
  local force_user="${2:-false}"
  local install_dir
  install_dir="$(get_install_dir "$force_user")"

  # Create install directory if needed
  mkdir -p "$install_dir"

  # Check if it's an external reference (contains @ for SHA)
  if [[ "$target" == *"@"* ]]; then
    # External skill with SHA pin
    local repo_url sha
    if ! read -r repo_url sha <<< "$(parse_external_ref "$target")"; then
      error "Invalid external reference: $target"
      echo "Format: github.com/org/repo@sha"
      return 1
    fi

    info "Installing external skill from $repo_url"
    info "SHA: ${sha:0:7}"

    # Clone to temp directory
    local tmp_dir
    tmp_dir=$(mktemp -d)
    trap "rm -rf '$tmp_dir'" EXIT

    if ! git clone --depth 1 "$repo_url" "$tmp_dir/repo" 2>/dev/null; then
      error "Failed to clone repository"
      return 1
    fi

    # Checkout specific SHA
    (cd "$tmp_dir/repo" && git fetch --depth 1 origin "$sha" && git checkout "$sha") 2>/dev/null || {
      error "Failed to checkout SHA: $sha"
      return 1
    }

    # Find skills in the cloned repo
    local found_skills=0
    while IFS= read -r -d '' skill_md; do
      local skill_dir="$(dirname "$skill_md")"
      local skill_name="$(basename "$skill_dir")"
      local dest_dir="${install_dir}/${skill_name}"

      info "Installing skill: $skill_name"
      rm -rf "$dest_dir"
      cp -r "$skill_dir" "$dest_dir"
      success "Installed $skill_name to $dest_dir"
      ((found_skills++))
    done < <(find "$tmp_dir/repo" -name "SKILL.md" -print0 2>/dev/null)

    if [[ $found_skills -eq 0 ]]; then
      error "No skills found in repository"
      return 1
    fi

    return 0
  fi

  # Internal marketplace skill
  local skill_path
  skill_path="$(find_skill "$target")"

  if [[ -z "$skill_path" ]]; then
    error "Skill not found: $target"
    echo ""
    echo "Available skills:"
    cmd_list
    return 1
  fi

  local skill_name
  skill_name="$(basename "$skill_path")"
  local dest_dir="${install_dir}/${skill_name}"

  info "Installing skill: $skill_name"
  info "From: ${skill_path#$SCRIPT_DIR/}"
  info "To: $dest_dir"

  rm -rf "$dest_dir"
  cp -r "$skill_path" "$dest_dir"

  success "Installed $skill_name"
}

# Uninstall a skill
cmd_uninstall() {
  local name="$1"
  local force_user="${2:-false}"
  local install_dir
  install_dir="$(get_install_dir "$force_user")"

  local skill_dir="${install_dir}/${name}"

  if [[ ! -d "$skill_dir" ]]; then
    error "Skill not installed: $name"
    return 1
  fi

  info "Removing skill: $name"
  rm -rf "$skill_dir"
  success "Uninstalled $name"
}

# List available skills in marketplace
cmd_list() {
  echo "Available skills in marketplace:"
  echo ""

  local found=0
  while IFS= read -r -d '' skill_md; do
    local skill_dir="$(dirname "$skill_md")"
    local skill_name="$(basename "$skill_dir")"
    local rel_path="${skill_dir#$PLUGINS_DIR/}"

    # Get description from frontmatter
    local description
    description=$(grep -m1 '^description:' "$skill_md" 2>/dev/null | sed 's/description:[[:space:]]*//' | head -c 60 | tr -d '\r')

    printf "  ${GREEN}%-25s${NC} %s\n" "$skill_name" "$description"
    ((found++))
  done < <(find "$PLUGINS_DIR" -name "SKILL.md" -print0 2>/dev/null | sort -z)

  if [[ $found -eq 0 ]]; then
    echo "  (no skills found)"
  fi
  echo ""
}

# List installed skills
cmd_installed() {
  local force_user="${1:-false}"
  local install_dir
  install_dir="$(get_install_dir "$force_user")"

  echo "Installed skills in $install_dir:"
  echo ""

  if [[ ! -d "$install_dir" ]]; then
    echo "  (install directory does not exist)"
    return
  fi

  local found=0
  for skill_dir in "$install_dir"/*; do
    if [[ -d "$skill_dir" && -f "${skill_dir}/SKILL.md" ]]; then
      local skill_name="$(basename "$skill_dir")"

      # Get version from frontmatter
      local version
      version=$(grep -m1 '^version:' "${skill_dir}/SKILL.md" 2>/dev/null | sed 's/version:[[:space:]]*//' | tr -d '\r')

      printf "  ${GREEN}%-25s${NC} v%s\n" "$skill_name" "${version:-unknown}"
      ((found++))
    fi
  done

  if [[ $found -eq 0 ]]; then
    echo "  (no skills installed)"
  fi
  echo ""
}

# Verify installed skills against lockfile
cmd_verify() {
  local strict="${1:-false}"

  if [[ ! -f "$LOCKFILE" ]]; then
    warn "Lockfile not found: $LOCKFILE"
    if [[ "$strict" == "true" ]]; then
      return 1
    fi
    return 0
  fi

  echo "Verifying against lockfile..."
  echo ""

  # Parse lockfile (simple JSON parsing with grep/sed)
  local issues=0
  local verified=0

  # Get all skill paths from lockfile
  # Match paths that look like plugins/... or templates/...
  local locked_skills
  locked_skills=$(grep -oE '"(plugins|templates)/[^"]+":' "$LOCKFILE" 2>/dev/null | sed 's/"//g; s/://' || true)

  if [[ -z "$locked_skills" ]]; then
    echo "  (no skills in lockfile)"
    echo ""
    success "Lockfile is empty - nothing to verify"
    return 0
  fi

  for skill_path in $locked_skills; do
    local full_path="${SCRIPT_DIR}/${skill_path}"

    if [[ ! -d "$full_path" ]]; then
      if [[ "$strict" == "true" ]]; then
        error "Missing: $skill_path"
      else
        warn "Missing: $skill_path"
      fi
      ((issues++)) || true
    else
      success "Found: $skill_path"
      ((verified++)) || true
    fi
  done

  echo ""
  if [[ $issues -gt 0 ]]; then
    echo "$issues issue(s) found"
    if [[ "$strict" == "true" ]]; then
      return 1
    fi
  else
    success "All $verified skill(s) verified"
  fi
}

# Show help
cmd_help() {
  cat << 'EOF'
oc.sh - OpenCode/Claude Code skill installer

Usage:
  ./oc.sh install <skill-name>              Install from marketplace
  ./oc.sh install <github-url>@<sha>        Install external with SHA pin
  ./oc.sh uninstall <skill-name>            Remove installed skill
  ./oc.sh list                              List available skills
  ./oc.sh installed                         List installed skills
  ./oc.sh verify [--strict]                 Verify against lockfile
  ./oc.sh help                              Show this help

Options:
  --strict    Exit with error on verification failures
  --user      Install to ~/.claude/skills instead of project

Examples:
  ./oc.sh install stripe-checkout
  ./oc.sh install github.com/anthropics/claude-skills@abc1234
  ./oc.sh uninstall stripe-checkout
  ./oc.sh verify --strict

Install Locations:
  Project: .claude/skills/ (if .claude/ exists in current or parent dir)
  User:    ~/.claude/skills/ (fallback, or with --user flag)
EOF
}

# Main
main() {
  local cmd="${1:-help}"
  shift || true

  # Parse global flags
  local force_user=false
  local strict=false
  local args=()

  for arg in "$@"; do
    case "$arg" in
      --user)
        force_user=true
        ;;
      --strict)
        strict=true
        ;;
      *)
        args+=("$arg")
        ;;
    esac
  done

  case "$cmd" in
    install)
      if [[ ${#args[@]} -lt 1 ]]; then
        error "Missing skill name or URL"
        echo "Usage: ./oc.sh install <skill-name|github-url@sha>"
        return 1
      fi
      cmd_install "${args[0]}" "$force_user"
      ;;
    uninstall|remove)
      if [[ ${#args[@]} -lt 1 ]]; then
        error "Missing skill name"
        echo "Usage: ./oc.sh uninstall <skill-name>"
        return 1
      fi
      cmd_uninstall "${args[0]}" "$force_user"
      ;;
    list|ls)
      cmd_list
      ;;
    installed)
      cmd_installed "$force_user"
      ;;
    verify|check)
      cmd_verify "$strict"
      ;;
    help|--help|-h)
      cmd_help
      ;;
    *)
      error "Unknown command: $cmd"
      cmd_help
      return 1
      ;;
  esac
}

main "$@"
