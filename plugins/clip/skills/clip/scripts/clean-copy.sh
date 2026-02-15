#!/usr/bin/env bash
# Clean text by removing terminal artifacts and copy to clipboard

set -euo pipefail

# Read stdin into variable
content=$(cat)

# Check if content is empty
if [[ -z "$content" ]]; then
  echo "Error: No content to copy"
  exit 1
fi

# Apply cleaning transformations
cleaned=$(echo "$content" | \
  # Remove ANSI escape codes (CSI sequences)
  sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g' | \
  # Remove ANSI OSC sequences
  sed -E 's/\x1b\][0-9;]*[a-zA-Z]//g' | \
  # Remove line number prefixes but preserve indentation (e.g., "  123→ " -> "")
  sed -E 's/^[[:space:]]*[0-9]+→ //g' | \
  # Remove markdown code fences
  sed '/^```/d' | \
  # Trim trailing whitespace
  sed 's/[[:space:]]*$//' | \
  # Remove carriage returns and bell characters
  tr -d '\r' | tr -d '\007')

# Copy to clipboard
echo "$cleaned" | pbcopy

# Count lines for feedback
line_count=$(echo "$cleaned" | wc -l | tr -d ' ')
char_count=$(echo "$cleaned" | wc -c | tr -d ' ')

# Provide feedback
echo "Copied to clipboard: ${line_count} lines, ${char_count} characters"

# Show preview of first 3 lines
echo ""
echo "Preview:"
echo "--------"
echo "$cleaned" | head -3
if [[ $line_count -gt 3 ]]; then
  echo "... ($(($line_count - 3)) more lines)"
fi
