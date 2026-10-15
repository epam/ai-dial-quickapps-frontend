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
- Hook files in `src/hooks/` are kebab-case too, named after the hook (`useDialFileManager` → `use-dial-file-manager.ts`); their tests are `tests/<same-name>.test.tsx`.

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

## i18n translation keys

Same rule as ai-dial-chat. In app TypeScript code, never pass a raw string literal translation
key to `t()` or `<Trans i18nKey>`. Every translation key must be declared in the appropriate
string enum in `src/constants/translation-keys.ts` and referenced through that enum (for
example, `t(DialFileManagerI18nKeys.ConflictReplace)`). When adding a key to
`src/i18n/locales/en.json`, add the matching enum member in the same change.

### Avoid duplicate translation values

Before adding a new key to `src/i18n/locales/en.json`, check whether the exact English string
already exists under `ButtonsI18nKeys` / `BasicI18nKeys` (or another shared group) in
`translation-keys.ts`. Generic, short UI strings — button/action labels such as "Copy",
"Log out", "Cancel", "Save" — belong in `ButtonsI18nKeys` and must be reused via that one key,
not re-declared per feature. Give a string its own feature-scoped key only when the wording is
genuinely feature-specific. When the same string already exists in ai-dial-chat's
`apps/chat/src/i18n/locales/en.json`, use chat's group and key path for it.

### Tests

`src/test-utils/setup.ts` mocks `react-i18next` for every test: `t` returns the key and ignores
interpolation values, `Trans` renders its `i18nKey`. Do not mock `react-i18next` again in a test
file; assert on enum members, and tell repeated items apart by their own visible data
(`within(row)`), not by interpolated labels.
