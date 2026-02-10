---
name: jj
description: This skill should be used instead of git. Use when the user asks to "rebase", "squash commits", "resolve conflicts", "merge changes", "undo changes", "create a workspace", "push a PR", or mentions JJ, Jujutsu, change IDs, or bookmarks. Enables multiple agents to work on the same Git repo locally using workspaces. JJ workflows for AI agentic development with Git colocation.
version: 0.1.0
---

# JJ for Agentic Workflows

JJ (Jujutsu) enables multiple AI agents to work on the same Git repository simultaneously using isolated workspaces. Each agent gets its own working copy while sharing the underlying repository. Change IDs are stable identifiers that survive rewrites, making them ideal for agent coordination.

## Initialize JJ

```bash
jj git init --colocate
```

The `--colocate` flag keeps JJ and Git in sync. Git remains in detached HEAD state (normal for JJ).

## Agent Workspaces

Create isolated workspaces for agents (each needs its own directory):

```bash
jj workspace add ../agent-1 --name agent-1
jj workspace add ../agent-2 --name agent-2
```

Layout:

```
parent/
├── myproject/
├── agent-1/
└── agent-2/
```

## Core Workflow

### Start a Task

```bash
jj git fetch
jj new main -m "implementing feature X"
```

### Complete Work

Option A - Finalize and prepare for next task:

```bash
jj commit -m "feat: add login validation"
```

Completed work is now `@-`. Report change ID:

```bash
jj log -r @- --no-graph -T 'change_id ++ "\n"'
```

Option B - Describe only (work stays in `@`):

```bash
jj describe -m "feat: add login validation"
jj log -r @ --no-graph -T 'change_id ++ "\n"'
```

### Start Fresh

```bash
jj new main -m "next task"
```

## Build on Another Agent's Work

```bash
cd ../agent-2
jj new kxrymlpv -m "extending agent-1's work"
jj new 'agent-1@' -m "extending agent-1's work"
```

Check `jj status` for conflicts after `jj new`.

## Conflict Resolution

JJ handles conflicts gracefully without blocking work.

```bash
jj status
```

Output shows "(conflict)" for conflicted files. Resolve with:

```bash
jj resolve
```

Or manually edit files and let JJ auto-detect resolution. Conflicts can be committed and resolved later.

## Monitor Agents

```bash
jj log -r 'working_copies()'
jj log -r kxrymlpv
jj diff -r kxrymlpv
```

## Create a PR

### Prepare Changes

```bash
jj git fetch
jj rebase -s <change-id> -d main@origin
jj squash
```

### Push with Bookmark

Use format: `username/TICKET-ID`

```bash
jj git push --named "aferguson/ACCOUNT-1234" --allow-new
jj bookmark track aferguson/ACCOUNT-1234
```

Or explicit two-step:

```bash
jj bookmark create aferguson/ACCOUNT-1234 -r <change-id>
jj git push -b aferguson/ACCOUNT-1234 --allow-new
```

### Update After Review

```bash
jj new aferguson/ACCOUNT-1234
jj squash
jj bookmark set aferguson/ACCOUNT-1234 -r @
jj git push
```

## Recovery

JJ tracks every operation in an immutable log. Any operation can be undone.

```bash
jj undo
```

View operation history:

```bash
jj op log
```

Restore to any previous state:

```bash
jj op restore <operation-id>
```

This makes JJ safe for experimentation - rebases, squashes, and merges can always be reverted.

## Additional Resources

For extended commands (rebasing strategies, squashing, merging, workspace management, revsets), see [references/commands.md](references/commands.md).
