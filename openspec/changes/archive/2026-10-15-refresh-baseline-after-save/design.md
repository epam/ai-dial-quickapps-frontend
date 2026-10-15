## Context

The saved state lives in two places:

- `EditorClient.appState.app` holds the loaded application: `applicationProperties`,
  attachment settings, and `_rawForSave` for the General fields. `handleSave` reads it for
  `existingConfig`, for the `hasChanges` baseline and for the General fields of a save without
  `general`. A Reset remounts the form from it.
- `useQuickApp2Form` holds `initialValues`, the dirty baseline. It is built once on mount.

Neither one is updated after a save.

## Goals / Non-Goals

**Goals:**

- After a successful save, both places describe the saved state.
- Edits made during an in-flight save are not lost and still count as unsaved.

**Non-Goals:**

- Refetching the application after a save.
- Translations lost on a save without `general`. That save sends `name` without `locales`, so
  chat-api stores a plain string. This is a separate finding, recorded in TECH_DEBT.
- Saves that are ignored and post no outcome (a separate finding).

## Decisions

1. **Build the saved state from the request, not from the response.** Since the generated client
   types `updateApplication`'s response loosely, `saveDialApp` returns
   `{ ...updated, id, applicationProperties }`. The editor already knows what it sent:
   `newConfig`, the attachment values and `effectiveGeneral`. Their `name` and `description` were
   recombined by `buildLocalizedText`, which mirrors what chat-api stores. Building from these keeps
   the held state in the editor's own shape, with decoded URLs and `_rawForSave`.
   - Alternative: refetch with `fetchDialApp` after every save. Rejected because it costs two more
     requests per save, and races with edits made in the meantime.
2. **The submitted snapshot becomes the baseline, not the current values.** `QuickApp2Form` keeps
   the `values` it submitted. Once `onSave` resolves to `true`, it dispatches
   `markSaved(snapshot)`, which sets `initialValues` to the snapshot. If the user typed during the
   save, `values` differs from the snapshot and the form stays dirty. That is correct: those edits
   are not saved.
   - The snapshot is the form values, not the zod-parsed `result.data`, because dirty tracking
     compares form values.
3. **`onSave` resolves to whether the save succeeded.** `EditorClient.handleSave` already catches
   failures and posts `SaveError`. It now resolves `true` after the update request succeeds and
   `false` otherwise. The prop type changes from `=> void` to `=> Promise<boolean>`.
4. **The display version is kept only when the save sent one.** The display version stays the
   loaded or last saved value unless `general.display_version` was a non-blank string, which is
   when chat-api changes it.

## Risks / Trade-offs

- Two overlapping saves can resolve out of order, and an older snapshot can then become the
  baseline. The form is then dirty against the newer values, and the next auto-save sends them
  again. The extra save is harmless and nothing is lost.
- `appState.app` gets a new object, so `AppContext` consumers re-render. `QuickApp2Form` keeps
  its `key`, so it is not remounted. The `existingModelId` sync only fills an empty model.
