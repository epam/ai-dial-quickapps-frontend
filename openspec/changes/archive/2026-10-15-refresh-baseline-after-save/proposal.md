## Why

Two findings in `docs/TECH_DEBT.md` have the same cause. One is "Load-time baseline is never refreshed
after a save", the other is "Stale General fields on auto-save". `EditorClient` sets `appState`
once at load (`EditorClient.tsx`), and `useQuickApp2Form` keeps its mount-time `initialValues`.
So after a successful save:

- the form stays dirty, and auto-save keeps saving the same values every interval;
- a second save with no edits still reports `SaveSuccess.hasChanges: true`;
- `RESET` brings back the values from load time instead of the last saved ones;
- a save without a `general` payload (auto-save) rebuilds `name`, `description`, `iconUrl` and
  `topics` from the load-time `_rawForSave`. It can revert a General-step edit that the host saved
  earlier in the session.

## What Changes

- After a successful save, the values that were submitted become the form's dirty baseline. Edits
  made while the save was in flight keep the form dirty.
- After a successful save, `EditorClient` replaces the application it holds with the saved state:
  - the `applicationProperties` that were sent;
  - `inputAttachmentTypes` and `maxInputAttachments`;
  - the General-step fields that were sent, and the display version when one was sent.

  `hasChanges`, Reset and the General fields of a later save without `general` all start from that
  state.

- A failed save changes nothing: the form stays dirty and the held application is unchanged.

## Capabilities

### Modified Capabilities

- `application_editing`: "Editor form state and dirty tracking", "Save request",
  "Meaning of SaveSuccess hasChanges", "Reset remounts the editor form".

## Impact

- **Code:** `src/components/EditorClient/EditorClient.tsx` (`handleSave` reports success and
  updates `appState`), `src/components/QuickApp2Form/QuickApp2Form.tsx` (waits for the save and
  marks the submitted values saved), `src/hooks/use-quick-app2-form.ts` (new `markSaved` action),
  and their tests.
- **Host integration:** after a successful save the host now receives DIRTY_STATE with
  `isDirty: false`, unless the user kept editing. Auto-save stops repeating clean saves.
  The message contract is unchanged.
- **API / chat-api:** no new endpoint, and fewer redundant `PATCH` requests.
- **i18n / RTL / accessibility:** none; there is no UI change.
- **Rollback:** revert the commit; no data or config migration.
