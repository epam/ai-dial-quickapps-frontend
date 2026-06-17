---
name: code-review-and-quality
description: Five-axis code review before merge. Use for quality passes after implementation, before merge, and when asked to review a diff.
context: fork
---

# Code review and quality

## Overview

Review every non-trivial change before it lands on the main branch. Use **five axes**: correctness, readability, architecture, security, performance.

**Approval bar:** Approve when the change clearly improves or preserves overall code health and matches project conventions. Do not block because you would have written it differently. Do block on real defects, security issues, or violations of agreed patterns.

## When to use

- Before merge / when asked to review a change
- After implementation (self-review or cross-review)
- After bugfixes (review fix **and** regression coverage)

## Review modes

| Mode             | Use when                            | Required context                                          |
| ---------------- | ----------------------------------- | --------------------------------------------------------- |
| **Local review** | Reviewing uncommitted local changes | `git status`, `git diff`, full changed files              |
| **PR review**    | Reviewing a GitHub PR number or URL | PR metadata, PR diff, full changed files at PR head       |
| **Self-review**  | Finishing an implementation slice   | Touched files, completed task, checks run                 |

For PR review, read full changed files, not only diff hunks. Diffs show what changed; full files show whether the change fits the surrounding design.

## Five-axis review

### 1. Correctness

- Matches the spec, task, or PR description
- Edge cases: null, empty, boundaries, errors — not only happy path
- Tests exist, assert behavior, and would catch regressions
- Watch for off-by-one, races, inconsistent state

### 2. Readability and simplicity

- Names are specific; avoid meaningless `data`, `result`, `temp`
- Control flow is easy to follow; avoid unnecessary cleverness
- Abstractions earn their complexity; prefer duplication over wrong abstraction until patterns repeat
- Comments only where intent is non-obvious; remove dead code and noise

### 3. Architecture

- Fits the `src/` structure: components in `components/`, pure utils in `utils/`, types in `types/`, context in `context/`, form logic in `form/`
- No business logic or API calls inside components — those belong in utils, context, or hooks
- No hardcoded API paths or environment values outside of env-var reads in designated modules
- Uses `@/*` alias rather than deep relative paths (`../../../`)
- Extensionless TypeScript source imports
- No circular dependencies or leaky module APIs

### 4. Security

- User and external input validated at boundaries (zod schemas for form data; origin checks for postMessage)
- No secrets or tokens in code, logs, or repo
- postMessage handlers verify `event.origin` before processing
- XSS-aware rendering; no `dangerouslySetInnerHTML` without sanitization

### 5. Performance

- No unnecessary re-renders (missing memoization on expensive derivations or callbacks)
- No sync work on hot paths (heavy computation in render body without `useMemo`)
- Unbounded lists: pagination or virtualization when applicable

## Code quality standards

- Prefer clear, specific names over generic `data`, `result`, `temp` when the domain is known.
- Keep control flow shallow with early returns or extracted helpers when nesting hides the main path.
- Avoid magic numbers — name domain thresholds, delays, limits.
- No `console.log` in application code.
- No TODO/FIXME in merge-ready code unless linked to a tracked follow-up.
- React components expose event callback props as `onEvent`; internal handlers are `handleEvent`.
- All components use `memo + default export` pattern: `export default memo(ComponentName)`.
- All props interfaces are named `{ComponentName}Props`.
- Conditional class composition uses `classNames` from `classnames`, not template literals.

## Validation commands

Select the smallest set that proves the change:

| Change type                     | Expected validation                               |
| ------------------------------- | ------------------------------------------------- |
| Component / hook / util         | `npm run lint`                                    |
| Type changes, new interfaces    | `npm run lint` + `npm run build`                  |
| Context or form schema changes  | `npm run lint` + `npm run build`                  |
| Broad cross-cutting change      | `npm run lint` + `npm run build`                  |
| UI change                       | lint + build + manual visual check in dev server  |

Record skipped checks with a reason. A review without a verification story is incomplete.

## Comment severity

| Label                         | Meaning                                             |
| ----------------------------- | --------------------------------------------------- |
| _(none)_ or **Required:**     | Must fix before merge                               |
| **Critical:**                 | Blocks merge — security, data loss, broken contract |
| **Nit:**                      | Optional — style, minor preference                  |
| **Optional:** / **Consider:** | Worth discussing, not blocking                      |
| **FYI:**                      | Context only                                        |

## Review process

1. **Context** — What does this change do? What is the expected behavior?
2. **Tests first** — Coverage, names, edge cases, behavioral assertions
3. **Implementation** — Walk files with the five axes
4. **Findings** — Every item labeled with severity above
5. **Verification story** — What was run, what still needs a human check (UI screenshots if relevant)
6. **Verdict** — Approve, comment, or request changes

## Decision policy

| Verdict             | Use when                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Approve**         | No blocking issues; relevant checks are green or CI covers it                              |
| **Approve/comment** | Only optional or low-risk improvements remain                                              |
| **Request changes** | Required issues, failing checks, missing tests for risky behavior                         |
| **Block**           | Security issue, data loss risk, broken public contract, secrets exposure                  |
| **Comment only**    | Draft PR, exploratory review, or user asked for non-blocking feedback                     |

## Review checklist

```markdown
## Review: [title]

### Context
- [ ] I understand intent and expected behavior

### Correctness
- [ ] Matches spec/task
- [ ] Edge and error paths covered
- [ ] Tests adequate and meaningful

### Readability
- [ ] Clear names and flow
- [ ] No unnecessary complexity

### Architecture
- [ ] Fits src/ structure (components, utils, types, context, form)
- [ ] No business logic or API calls inside components
- [ ] postMessage handlers verify origin
- [ ] Extensionless TypeScript source imports
- [ ] @/* alias used instead of deep relative paths

### Security
- [ ] postMessage origin validated
- [ ] User input validated with zod at boundaries
- [ ] No secrets; XSS-safe rendering

### Performance
- [ ] No avoidable re-renders; memoization where appropriate
- [ ] No sync heavy work in render

### Component conventions
- [ ] memo + default export pattern used
- [ ] Props interface named {ComponentName}Props
- [ ] classNames used for conditional classes
- [ ] UI kit components preferred over raw HTML

### RTL parity
- [ ] Logical Tailwind classes used (ms-/me-, ps-/pe-, start-/end-)
- [ ] Directional icons mirrored with rtl:scale-x-[-1]

### Verification
- [ ] npm run lint passes
- [ ] npm run build passes (when types/interfaces changed)
- [ ] Manual/visual check noted if UI

### Verdict
- [ ] Approve | [ ] Request changes (list blocking items)
```

## Rationalizations to reject

| Excuse                     | Response                                                     |
| -------------------------- | ------------------------------------------------------------ |
| "It works, ship it"        | Readability, security, and architecture debt still compound. |
| "Tests pass, so it's good" | Tests don't replace architecture or security review.         |
| "We'll clean up later"     | Cleanup before merge unless true emergency + tracked follow-up. |
