Slicing strategy: **vertical per defect** — each fix lands with the test that pins its scenario.

## 1. Theme load

- [x] 1.1 In `src/context/ThemeContext.tsx`, treat a non-2xx response as a failed load and ignore a
      response that settles after unmount; correct the fallback comment. Add tests in
      `src/context/tests/ThemeContext.test.tsx` for "Themes endpoint answers with an error status"
      and "Provider unmounts before the response".
  - Verification: `npx vitest run src/context/tests/ThemeContext.test.tsx`, `npm run lint`, `npm run typecheck`.

## 2. File manager

- [x] 2.1 In `src/hooks/use-dial-file-manager.ts`, check `DIAL_HIDDEN_FOLDER_MARKER` before the
      hidden-name rule in `onCreateFolderValidate`; add the "Reserved marker name" case to
      `src/hooks/tests/use-dial-file-manager.test.tsx`.
  - Verification: `npx vitest run src/hooks/tests/use-dial-file-manager.test.tsx`.
- [x] 2.2 In `src/components/common/FileManagerModal/FileManagerModal.tsx`, render the notification
      banner inside an always-present `aria-live="polite"` `aria-atomic="true"` region and give an
      error banner `role="alert"`; add "Notifications are announced" to
      `src/components/common/FileManagerModal/tests/FileManagerModal.test.tsx`.
  - Verification: `npx vitest run src/components/common/FileManagerModal`, then the full `npm test`.

## 3. Docs

- [x] 3.1 Mark the three findings fixed in `docs/TECH_DEBT.md`.
