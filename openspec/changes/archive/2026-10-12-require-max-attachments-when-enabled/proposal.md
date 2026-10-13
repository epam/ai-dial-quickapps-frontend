# Proposal

## Why

Issue #240: with Attachments on, clearing "Maximum attachments amount user can add" in Advanced settings saves with no validation. The saved app omits `maxInputAttachments`, and Preview silently falls back to one file ("Can only add 1 file"). An empty value is also reachable without opening the popup, because turning Attachments on never sets a max.

## What Changes

- Add `DEFAULT_MAX_INPUT_ATTACHMENTS` (`1`, the host's existing effective fallback, so no behaviour change for existing apps).
- Turning Attachments on with an empty max seeds the default in the same form update. A previously set max is kept.
- Turning Attachments off keeps `maxInputAttachments` (only `inputAttachmentTypes` is cleared), so off → on restores the user's value. A max that was only seeded by the toggle is reverted on turn-off so the form is not left dirty.
- Loading an app that has attachment types but no max seeds the default (baseline included, so not dirty).
- The max is required while attachments are enabled: the popup blocks Save on empty with a new message, and `QuickApp2Schema` reports an error on `maxInputAttachments` so editor save/auto-save is blocked too.
- When attachments are off the field stays optional and editable.

Alternatives considered: always-required (rejected: forces a value on apps without attachments); schema-only validation with no seeding (rejected: the popup-not-opened case would produce a blocking error on a field the user never saw).

Backward compatible; no payload shape change. Revert by reverting the change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `application_advanced-settings`: max attachments is required when attachments are enabled; empty-value scenario replaced.
- `application_user-attachments`: toggling seeds the default max and preserves a user-set max across off/on; legacy load seeds the default; schema reports empty max when enabled.

## Impact

- `src/form/quickApp2Form.ts` (`MaxInputAttachmentsSchema`, `isValidMaxInputAttachments`, `superRefine`, `buildFormValues`), `src/constants/quick-apps.ts`, `src/components/QuickApp2Form/QuickApp2Form.tsx`, `src/components/Settings/AdvancedSettingsPopup/AdvancedSettingsPopup.tsx` (+ prop through `SettingsSection` / `ModelConfigurationSection`), `src/constants/i18n.ts`.
- i18n: one new string, `quickAppEditor.MaxAttachmentsRequired` ("Maximum attachments amount is required"). The English locale JSON (`src/i18n/locales/quick-app-editor.json`) gets the matching entry.
- RTL: none; only an error message on an existing input.
- No auth, host-integration or API-layer changes.

## Non-goals

Hiding or disabling the field while Attachments is off; changing the payload shape; changing host-side limits.

## Acceptance criteria

- Enabling Attachments without opening the popup saves `maxInputAttachments: 1`.
- Set 5, turn off, turn on: still 5.
- Clearing the field with attachments on blocks popup Save and shows the error.
- Legacy app (types, no max) loads with 1 and is not dirty.
