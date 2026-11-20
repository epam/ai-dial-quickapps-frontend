## Why

Attachment types can only be picked one concrete MIME type at a time, so allowing "any image" or "any text file" means typing `image/*` by hand with no hint that wildcards are accepted. Separately, the default maximum of 1 attachment is too low to be a useful starting point once attachments are enabled.

## What Changes

- Add MIME type group suggestions (`image/*`, `text/*`, `application/*`, the prefixes of the types already declared in code) to the Attachment types autocomplete. They are listed before the concrete types and can be combined with them.
- Change the default `max_input_attachments` seeded by the Attachments switch and applied to loaded apps that have attachment types but no valid max from `1` to `10`.
- No change to storage: groups are saved in `input_attachment_types` as plain strings, as free-text entry already allows. No format validation is added.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_user-attachments`: new group suggestions and their ordering and scenarios; the default max changes from `1` to `10` in the toggle and load requirements.

## Impact

- `src/constants/attachment-types.ts`: group suggestions ahead of `ATTACHMENT_TYPE_SUGGESTIONS`.
- `src/constants/quick-apps.ts`: `DEFAULT_MAX_INPUT_ATTACHMENTS` becomes `10`.
- Tests that assume the default `1`: `src/form/tests/quick-app-form.test.ts` and the Attachments and `QuickApp2Form` tests.
- Existing apps already saved with `max_input_attachments: 1` are unaffected; only unset or invalid values get the new default.
- No API, dependency or i18n change (names are untranslated identifiers).
