---
name: figma
description: Design-to-code workflow for Figma designs. Use when the user shares a Figma URL or asks to implement a design into the codebase.
---

# Figma Design-to-Code

## Overview

Translate Figma designs into production-ready React components that match project conventions: React 19, Next.js 16 App Router, Tailwind CSS v4, TypeScript, and `@epam/ai-dial-ui-kit`.

## When to use

- User shares a `figma.com` URL
- User says "implement this design" or "build this screen"
- User asks to match a Figma component or layout

## Workflow

### Step 1 — Fetch the design

Call `get_design_context` with the `fileKey` and `nodeId` extracted from the URL.

URL parsing rules:

- `figma.com/design/:fileKey/...?node-id=:nodeId` → replace `-` with `:` in nodeId
- `figma.com/board/:fileKey/...` → FigJam file, use `get_figjam` instead

If the design context includes **Code Connect** snippets, prefer those — they map directly to codebase components.

### Step 2 — Map to project components

Before writing any new code, check whether UI kit or existing project components cover the need:

| Design need                    | Check first                       |
| ------------------------------ | --------------------------------- |
| Buttons, inputs, modals, icons | `@epam/ai-dial-ui-kit`            |
| Generic icons                  | `@tabler/icons-react`             |
| Layout, spacing, color         | Tailwind CSS classes              |
| Project-specific patterns      | `src/components/` in this project |

Grep the codebase before building from scratch:

```
Grep("ComponentName", path="src/components/")
```

### Step 3 — Implement

- Write TypeScript + JSX; no plain JS
- Use `async`/`await` with `try`/`catch`/`finally`; avoid Promise chains with `.then()`/`.catch()`
- Use Tailwind for all styling — no inline styles unless driven by dynamic JS values
- Do not copy raw hex colors from Figma; map to Tailwind tokens or CSS variables already in `src/app/globals.css`
- Match the naming conventions of surrounding files (PascalCase components, kebab-case files)
- Name React event callback props `onEvent` and component-local handlers `handleEvent`
- Keep components small and focused — split at logical boundaries, not line count
- Use `classNames` from the `classnames` package for conditional class composition
- Export components as memoized default exports: `export default memo(ComponentName)`
- Mark files that use hooks or browser APIs with `'use client'` at the top
- Use `@/*` alias for imports from `src/`

### Step 4 — Verify

After implementation:

1. Run `npm run lint` — fix any lint errors before reporting done
2. Run `npm run build` — fix any TypeScript errors
3. If the dev server is running, open the component in the browser and compare with the Figma screenshot at each relevant viewport size

## Constraints

- Never use absolute positioning unless the Figma design explicitly requires it and no flex/grid alternative exists
- Do not add new dependencies without asking — check if the need is already met
- Pixel-perfect fidelity matters less than semantic correctness and accessibility
- If the design is ambiguous or missing states (hover, disabled, error), flag them explicitly rather than guessing
- Apply RTL rules: use logical Tailwind classes (`ms-*`/`me-*` etc.) and mirror directional icons with `rtl:scale-x-[-1]`
