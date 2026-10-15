Slicing strategy: **vertical, form first**. The baseline action lands with its hook tests, then the
editor wiring with the end-to-end scenarios.

## 1. Form baseline

- [x] 1.1 Add a stable `markSaved(values)` action to `useQuickApp2Form`
      (`src/hooks/use-quick-app2-form.ts`) that sets `initialValues` to `values`. Cover it in
      `src/hooks/tests/use-quick-app2-form.test.tsx`, including edits made after
      the snapshot.
- [x] 1.2 In `QuickApp2Form`, change `onSave` to return `Promise<boolean>`. Keep the submitted
      `values` snapshot and call `markSaved(snapshot)` when `onSave` resolves to `true`.
  - Verification: `npx vitest run src/components/QuickApp2Form`.

## 2. Held saved application

- [x] 2.1 In `EditorClient.handleSave`, resolve to `true` or `false`. After a success, replace
      `appState.app` with the saved state built from the request: config, attachment values,
      General fields, and the display version when one was sent.
- [x] 2.2 Add `EditorClient` tests for "Successful save cleans the form", "Second save without
      new edits", "Auto-save after a General-step save", "Reset after a save" and "Failed save
      keeps the form dirty".
  - Verification: `npx vitest run src/components/EditorClient`, then the full `npm test`,
    `npm run lint` and `npm run typecheck`.

## 3. Docs

- [x] 3.1 In `docs/TECH_DEBT.md`, mark "Load-time baseline is never refreshed after a save" and
      "Stale General fields on auto-save" fixed. Add the finding that a save without `general`
      sends `name` without `locales`, so chat-api stores a plain string.
- [x] 3.2 `openspec validate refresh-baseline-after-save --strict`.
