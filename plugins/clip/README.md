# Clip

Copy content from Claude Code conversations to your clipboard with clean formatting.

## Prerequisites

- **macOS** (uses `pbcopy`)

## Usage

```
/clip          # Copy last code block
/clip text     # Copy last text response
/clip command  # Copy last bash command
/clip all      # Copy entire last response
/clip plan     # Copy most recent Claude Code plan
```

The cleaning script strips ANSI codes, line numbers, and terminal artifacts before copying.
