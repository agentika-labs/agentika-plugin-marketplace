# JJ Command Reference

Extended JJ commands for agentic workflows.

## Rebasing

```bash
jj rebase -s <change> -d main
jj rebase -s <change> -d main --skip-emptied
jj rebase -r '<change>::' -d main
```

## Squashing

```bash
jj squash
jj squash --from <change> --into main
jj squash -i
```

## Merging

```bash
jj new main <change> -m "merge feature"
jj new main agent-1@ agent-2@ -m "merge all"
```

## Viewing Changes

```bash
jj diff -r <change>
jj diff -r <change> --git
jj diff -r <change> --summary
jj diff --from <change> --to main
```

## History

```bash
jj log -r 'ancestors(<change>) & ~ancestors(main)'
jj log -r 'ancestors(@, 5)'
```

## Workspaces

```bash
jj workspace list
jj workspace root
jj workspace forget <name>
jj workspace update-stale
```

## Bookmarks

```bash
jj bookmark create <name> -r <change>
jj bookmark set <name> -r <change>
jj bookmark delete <name>
jj bookmark list
jj git push --bookmark <name>
jj git push --bookmark <name> --allow-new
jj git push --bookmark <name> --deleted
```

## Conflict Resolution

```bash
jj status
jj resolve
jj new <conflicted-change>
jj squash
```

## Cleanup and Restructuring

```bash
jj abandon <change>
jj edit <change>
jj absorb
jj split
jj duplicate <change>
```

## Operation History

```bash
jj op log
jj undo
jj op restore <operation-id>
```

## Git Sync

```bash
jj git fetch
jj git fetch --remote origin
jj git fetch --tracked
```

## File Inspection

```bash
jj show <revision>
jj cat <revision> -- <filepath>
jj file annotate <filepath>
```

## Revset Syntax

| Revset | Meaning |
|--------|---------|
| `@` | Current working copy |
| `@-` | Parent of working copy |
| `main` | The main bookmark |
| `<id>` | Change by ID |
| `agent-1@` | Working copy of agent-1 workspace |
| `working_copies()` | All workspace working copies |
| `ancestors(x)` | All ancestors of x |
| `ancestors(x, N)` | Ancestors with depth limit |
| `x::y` | Range from x to y |
| `x & y` | Intersection |
| `x \| y` | Union |
| `~x` | Negation |
