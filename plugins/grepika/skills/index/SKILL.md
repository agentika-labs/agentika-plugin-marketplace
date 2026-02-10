---
name: index
description: |
  Use this skill when the user asks to "index the codebase",
  "build search index", "reindex", "update the index",
  or mentions keywords related to building or refreshing
  the grepika code search index.
version: 1.0.0
disable-model-invocation: true
context: fork
allowed-tools:
  - mcp__grepika__add_workspace
  - mcp__grepika__index
  - mcp__grepika__stats
---

Index the grepika codebase for code search.

## Arguments

`$ARGUMENTS`

## Behavior

- If arguments are empty or not "incremental": **force rebuild** the index (`force: true`)
- If arguments contain "incremental": **incremental update** (`force: false`, skips unchanged files)

## Steps

1. Call `mcp__grepika__add_workspace` with path set to the project root directory (from your working directory context)
2. Call `mcp__grepika__index` with `force: true` (default) or `force: false` (if incremental)
3. Call `mcp__grepika__stats` with `detailed: true`
4. Report results in this exact format:

```
## Index Complete

| Metric | Value |
|--------|-------|
| Total files | N |
| Indexed files | N |

### File Types
[file type breakdown from stats detailed output]
```

## Important

- Do NOT use a sub-agent. Call the MCP tools directly in the main conversation.
- Be concise. No extra explanation needed beyond the table.
