## Why

QuickApps saves itself every 30 seconds while the editor is mounted and the form is dirty. Each
tick sends a `PATCH` straight to the live application, with no draft layer, so a half-edited
configuration goes live between manual saves. The tick is a second writer next to the host's
Save and Preview, and it fails silently on an invalid form. The host already owns when the
application is saved (Save, Preview, and `TRIGGER_AUTO_SAVE`), so the editor's own timer is not
needed.

## What Changes

- Remove the editor's own 30-second auto-save interval (`EditorClient` effect and
  `AUTO_SAVE_INTERVAL_MS`).
- Remove the "Auto-save interval" requirement from `application_editing`, and the
  references to the interval in "Save trigger gating" and "Save outcome messages".
- Keep the host-driven auto-save unchanged: `TRIGGER_AUTO_SAVE` with its gating
  (`hasSavedOnce`, dirty check, `ignoreDirty`) and the `AUTO_SAVE_COMPLETE` / `SAVE_ERROR`
  outcomes. The host contract in `host-integration` does not change.
- Update `README.md`, `docs/quickapps-migration-guide.md` and the tests that cover the interval.

**BREAKING (behavior, not protocol):** unsaved edits are no longer written every 30 s. A user who
closes the editor without Save, and a host that never sends `TRIGGER_AUTO_SAVE`, loses those edits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_editing`: drops the "Auto-save interval" requirement; "Save trigger gating" and
  "Save outcome messages" no longer mention the interval.

## Impact

- **Code:** `src/components/EditorClient/EditorClient.tsx` (interval effect, import),
  `src/constants/editor.ts` (`AUTO_SAVE_INTERVAL_MS`),
  `src/components/EditorClient/tests/EditorClient.test.tsx` ("auto-save interval" suite).
- **Docs:** `README.md` (auto-save paragraph), `docs/quickapps-migration-guide.md` (Auto-save row).
- **Specs:** `application_editing` only. `host-integration` is untouched.
- **Cross-repo:** none required. ai-dial-chat keeps working; if it relied on the timer as a
  safety net, it should send `TRIGGER_AUTO_SAVE` itself (to confirm with the chat team).
- **i18n / RTL:** no strings, no UI.
- **Rollback:** revert the change; the interval returns as before.

## Acceptance criteria

- No `PATCH` is sent without a host trigger, however long the form stays dirty.
- `TRIGGER_AUTO_SAVE` still behaves as specified and posts `AUTO_SAVE_COMPLETE` on success.
