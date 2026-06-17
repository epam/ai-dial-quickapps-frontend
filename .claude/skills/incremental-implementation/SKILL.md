---
name: incremental-implementation
description: Build in thin vertical slices. Use for any multi-file change, refactor, or feature where scope can grow and verification must stay continuous.
---

# Incremental implementation

## Overview

Build in thin vertical slices — implement one piece, test it, verify it, then expand. Avoid implementing an entire feature in one pass. Each increment should leave the system in a working, testable state.

## When to use

- Any multi-file change, new feature, or refactor
- Whenever you are about to write a large amount of code before verifying

**When not to use:** single-file, single-function changes that are already minimal.

## Verification commands

After each slice, verify what you touched:

- `npm run lint` — lint the whole project (fast; run after every slice)
- `npm run build` — full type-check and build (run when you change types, context, or component interfaces)

## The increment cycle

1. **Implement** the smallest complete piece of functionality
2. **Verify** — run lint; run build when types or interfaces changed
3. **Commit** — descriptive message; keep the increment revert-friendly
4. **Next slice** — carry forward; do not restart from scratch

## Slicing strategies

- **Vertical slices (preferred):** one path through the stack until it works end-to-end.
- **Contract-first:** agree on types first, then build the feature on top.
- **Risk-first:** prove the highest-risk part (e.g. postMessage protocol, API shape) before building the rest.

## Implementation rules

**Simplicity first:** smallest thing that could work; avoid premature abstraction (wait for the third use case before abstracting).

**Scope discipline:** touch only what the task requires. Note follow-ups instead of doing them in the same increment.

**Path alias:** use `@/...` imports rather than relative paths that go up multiple levels.

**Module specifiers:** relative imports between `.ts`/`.tsx` source modules omit extensions. Preserve extensions for `.css`, `.json`, and image files.

**One thing at a time:** one logical change per increment; do not mix unrelated refactors with features.

**Keep it compilable:** after each increment, `npm run build` must pass for the scope you are responsible for.

**Feature flags:** if incomplete work must merge, hide it behind an env var or conditional (safe default off).

**Rollback-friendly:** prefer additive changes; separate "delete old" from "add new" when it helps bisect and revert.

## Increment checklist

After each increment:

- [ ] The change does one thing and completes it
- [ ] `npm run lint` passes
- [ ] `npm run build` passes (when types or interfaces changed)
- [ ] New behavior matches the slice intended
- [ ] Commit message describes the slice clearly
- [ ] No stray uncommitted changes that belong in the task

## Common rationalizations

| Rationalization                     | Reality                                              |
| ----------------------------------- | ---------------------------------------------------- |
| "I'll test at the end"              | Bugs compound; early slices invalidate later work.   |
| "Faster to do it all at once"       | Breaks are harder to localize in huge diffs.         |
| "Too small to commit separately"    | Small commits are cheap; large ones hide bugs.       |
| "Small refactor in the same change" | Mixing refactor and feature hurts review and bisect. |

## Red flags

- More than ~100 lines without running lint/build
- Multiple unrelated changes in one increment
- Scope expansion ("just this too")
- Skipping verify to "move faster"
- Leaving build/lint broken between slices
- Abstractions before the problem repeats
- Edits outside task scope "while I'm here"
