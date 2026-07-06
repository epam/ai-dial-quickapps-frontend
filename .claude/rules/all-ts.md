---
globs: '**/*.ts,**/*.tsx'
applyTo: '**/*.ts,**/*.tsx'
alwaysApply: false
---

# TypeScript conventions

- **Never** write nested ternary expressions. Use `if`/`else` blocks, early returns, or `switch` instead.
- Prefer `async`/`await` with `try`/`catch`/`finally` over Promise chains with `.then()`/`.catch()`.
- Prefer arrow-function constants over `function` declarations for helpers and exported functions.
- Use the `void` operator before Promise-returning calls only for intentional fire-and-forget work where errors are handled internally.
- Prefer `value == null` over `value === null || value === undefined`, and `value != null` over `value !== null && value !== undefined`, unless you must distinguish `null` from `undefined` explicitly.
- Utility/helper files must be named in kebab-case after their primary export (e.g. `encode-api-url.ts`) and must not use the `.utils` suffix.

## Component folder structure

Component folders under `src/components/` must use PascalCase and match the component name (e.g. `ToggleSwitch/ToggleSwitch.tsx`). Tests go in a `tests/` subfolder inside the component folder.

Don't write utility functions in the same file as a component. If a helper is needed, place it in `src/utils/` in an appropriately general file (e.g. `src/utils/formatting.ts`) rather than a narrow single-purpose file.

## Types and interfaces

Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and other composite types.

Place shared interfaces in `src/types/`. Props interfaces that are tightly coupled to a single component may live in that component's file.

A component's props interface must never be an inline anonymous type. Name it `{ComponentName}Props` (e.g. `ToggleSwitchProps`).

Prefer string enums over union types for named finite sets of statuses, modes, variants, or lifecycle states — especially when reused, exported, or compared in logic. Place enums in `src/types/` or `src/constants/`.

## Boolean naming

Boolean variables, state, and props must begin with a semantically clear prefix: `is`, `has`, `can`, `should`, or `will`.

```text
// Correct
isOpen, isLoading, hasError, canSend, shouldRedirect

// Wrong
open, loading, error as boolean, send, redirect
```

## Event handler naming

Name React event callback props `onEvent` and component-local handlers `handleEvent`:

```tsx
// Correct
<MyComponent onChange={handleChange} onSave={handleSave} />
const handleChange = (value: string) => { ... };

// Wrong
<MyComponent change={onChange} save={doSave} />
```
