## Why

Writing the `theming` and `context-files` specs (change `specify-uncovered-capabilities`) found
three small defects with an obvious fix, recorded in `docs/TECH_DEBT.md`'s findings section.

## Problem

- `ThemeProvider` never checks `res.ok` (`src/context/ThemeContext.tsx:77-78`): a `503` with a JSON
  error body is stored as the theme configuration, and falls back only because it lacks `themes`.
  The fetch also sets state after unmount, against `openspec/config.yaml`'s "Fetch inside useEffect
  with a cancelled flag" design rule. Its comment names a `globals.css` that does not exist.
- File manager notifications are not announced: the banner (`FileManagerModal.tsx:464-476`) is a
  plain `div` mounted with its text, with no live region or role.
- `FolderNameReserved` can never fire: `.dial_folder` starts with `.`, so the `FolderNameHidden`
  check runs first (`use-dial-file-manager.ts:447-452`). Rename already checks the marker early
  (`:652`).

## Solution

1. `ThemeContext`: treat a non-2xx response as a failed load, and ignore a response that settles
   after unmount (cancelled flag in the effect). Correct the fallback comment.
2. `FileManagerModal`: render the banner inside a live region that is always present while the
   popup is open (`aria-live="polite"`, `aria-atomic="true"`); give an error banner `role="alert"`.
3. `useDialFileManager.onCreateFolderValidate`: check the reserved marker before the hidden-name
   rule, as rename does.

## Alternatives considered

- Replace the banner with the kit `Notification` (which sets `role` per variant) — rejected here:
  it changes the banner's look (icon, layout) beyond this fix; a persistent wrapper is enough.
- Drop `FolderNameReserved` instead — rejected: the reserved marker deserves its own message, and
  rename already uses one.

## Non-goals

- The other findings (theme picker, Markdown editor theme on a failed load, upload messages, …).
- Switching to the typed `ThemesApi`.

## Acceptance criteria

- `openspec validate fix-file-manager-and-theme-load-defects --strict` passes.
- New tests pin each modified scenario; `npm test`, `npm run lint`, `npm run typecheck` pass.

## What Changes

- `theming`: MODIFIED "Theme falls back to the built-in CSS defaults…" (non-2xx and unmount).
- `context-files`: MODIFIED "Creating folders" (reserved marker order) and "Notifications, busy
  states, direction and accessibility" (live region).

## Capabilities

### Modified Capabilities

- `theming`: a non-2xx theme response falls back; a late response after unmount is discarded.
- `context-files`: `.dial_folder` reports `FolderNameReserved`; notifications are announced.

## Impact

- **Code:** `src/context/ThemeContext.tsx`, `src/components/common/FileManagerModal/FileManagerModal.tsx`,
  `src/hooks/use-dial-file-manager.ts`, and their tests.
- **API / chat-api, auth, host integration:** none.
- **i18n:** no new strings (`FolderNameReserved` already exists). **RTL:** none.
- **Rollback:** revert the commit; no data or config migration.
