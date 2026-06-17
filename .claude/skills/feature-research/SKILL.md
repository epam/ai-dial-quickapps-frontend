---
name: feature-research
description: Researches feature directions before implementation. Use when the user asks to investigate approaches, compare options, assess risks/trade-offs, and recommend an implementation path.
---

# Feature Research

## Overview

Use this skill to perform structured, source-grounded research before implementation. The goal is to reduce rework and clarify decisions for broad or high-impact features.

## When to use

- The request is broad (architecture, cross-cutting, platform-level)
- Multiple valid approaches exist
- The user asks for "best practices", trade-offs, or recommendations
- The team needs a decision record before implementation

## Research process

1. **Clarify scope**
   - What problem are we solving?
   - What constraints matter (time, compatibility, security, performance)?
   - What is explicitly out of scope?

2. **Map options**
   - Produce 2–4 realistic options (not one obvious answer)
   - Include a conservative baseline option

3. **Gather evidence**
   - Use authoritative sources first (official docs, standards, mature references)
   - Distinguish facts from assumptions
   - Flag unknowns explicitly

4. **Evaluate trade-offs**
   - Correctness and maintainability
   - Complexity and delivery risk
   - Security and performance implications
   - Migration and rollback impact

5. **Recommend a path**
   - Pick one option as primary recommendation
   - Explain why alternatives were not chosen
   - Define phased rollout (thin vertical slices)

## Output contract

When delivering research, provide:

- **Context:** problem statement, constraints, non-goals
- **Options:** each option in 3–6 bullets
- **Comparison:** pros/cons/risks table
- **Recommendation:** chosen option and rationale
- **Execution draft:** first increments and verification plan
- **Open questions:** what must be decided before implementation

## Quality bar

- No implementation without a clear recommendation or explicit uncertainty
- No "best practice" claims without concrete evidence
- Avoid one-sided analysis; include meaningful alternatives
- Keep recommendations actionable: reference `npm run lint`/`npm run build` as verification steps, `@/*` imports, and the existing `src/` structure

## Verification checklist

- [ ] Scope and constraints are explicit
- [ ] At least 2 viable options are compared
- [ ] Risks and rollback strategy are described
- [ ] Recommendation is concrete and justified
- [ ] Next implementation slices are proposed
