---
name: deslop
description: |
  Remove AI-generated slop from the current branch. Use when the user says
  "deslop", "remove slop", "clean up AI code", or "remove AI patterns".
version: 0.1.0
disable-model-invocation: true
allowed-tools:
  - Read
  - Edit
  - Bash
---

<default_to_action>
Remove slop directly rather than suggesting changes. Edit files immediately.
</default_to_action>

## Changed files

!`jj diff --from main --summary`

## Full diff

!`jj diff --from main`

## Instructions

Review every change in the diff above and remove all AI-generated slop introduced in this branch.

<process>
Before editing each file, read its existing style — comment density, naming conventions, error handling patterns, level of abstraction. Use the *unchanged* surrounding code as the baseline. "Slop" is anything the AI added that a human familiar with this codebase would not.
</process>

<review_criteria>

### 1. Unnecessary comments
- Comments that restate what the code already says (`// increment counter` above `counter++`)
- Explanatory comments for obvious logic that the rest of the file leaves uncommented
- Comment density significantly higher than the surrounding, unchanged code
- Commented-out code that should simply be deleted

### 2. Over-engineering
- Helper functions, wrappers, or abstractions for one-time operations
- Premature generalization — making something configurable or generic when only one case exists
- Barrel exports, re-export layers, or index files that just aggregate imports
- Extra configurability, options, or parameters nobody asked for

### 3. Defensive over-coding
- Error handling, null checks, or validation for conditions that cannot occur in context
- Catching errors only to ignore, log, or re-throw them without adding value
- Validating inputs already guaranteed by types, callers, or framework contracts
- Fallback values for cases that are unreachable

### 4. Style inconsistency
- Naming conventions (casing, prefixes, verbosity) that differ from the rest of the file
- Formatting or structural patterns that don't match surrounding code
- Verbose constructs where the file uses concise idioms, or vice versa
- Importing or using different patterns than existing code for the same task

### 5. Dead code and redundancy
- Unused imports, variables, parameters, or type declarations
- Backwards-compatibility shims — renamed `_vars`, re-exports for removed code, `// removed` markers
- Feature flags that are never toggled or conditional paths that are always taken
- Duplicate logic that already exists elsewhere in the file or module

### 6. Verbose where concise is idiomatic
- Explicit type annotations where inference works and the file relies on inference elsewhere
- Verbose null-checking where null-coalescing or optional chaining is the file's convention
- Manual iteration where higher-order functions are the established pattern (or vice versa)
- Multi-line constructs that the file's idiom handles in one line

</review_criteria>

After completing this task, provide a 1-3 sentence summary of what you changed.
