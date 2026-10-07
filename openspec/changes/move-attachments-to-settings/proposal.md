## Why

The design moves user attachments out of the main column and into Configuration, under the Settings row. There it becomes an **Attachments** switch that reveals a required **Attachment types** field. That field suggests known MIME types and also accepts custom ones, matching the DIAL admin app's attachment-types input. Today Attachment types is a free-text MIME tag input with no suggestions, in its own User attachments section (`src/components/UserAttachments/UserAttachmentsSection.tsx:29-54`). It validates entries against a regex (`src/hooks/use-quick-app2-form.ts:279-294`). `docs/TECH_DEBT.md` lists `application_user-attachments` only as a candidate with no spec, so per AGENTS.md this change also writes that spec.

## What Changes

- Add an **Attachments** row to Configuration, directly below the Settings row. It has a translated title, the description "Lets end users upload files during a conversation. Useful for sharing documents, images, or data the agent needs to process." and a trailing switch.
- **Toggle in the form, derived from data on load:** the switch is a form-only `attachmentsEnabled` value in `useQuickApp2Form`. It starts ON when the application has at least one attachment type and OFF otherwise. Turning it OFF clears `inputAttachmentTypes`. Turning it ON shows the Attachment types field with nothing selected. No new persisted field.
- **Attachment types** becomes a required MIME tag input with suggestions, as in the admin app (`ai-dial-admin-frontend` `MultiValueAutocomplete`):
  - Typing shows up to 5 matching suggestions (name … MIME, e.g. GIF … `image/gif`) from the admin's MIME list.
  - Enter or comma adds the highlighted suggestion or the typed text.
  - Tags show the raw MIME types.
  - There's no format validation; a caption explains the `<type>/<subtype>` form.
- Saved values outside the suggestion list are shown as tags unchanged.
- With the switch ON and nothing selected, the form is invalid: the field shows the required error, and save and auto-save are blocked until a type is added or the switch is turned OFF.
- **BREAKING (UI only):** the User attachments section is removed from the main column, together with the MIME-format validation and its reset-key mechanism. Stored data is unaffected.
- `inputAttachmentTypes` moves off the react-hook-form legacy bridge (`src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx:12-22`) onto `useQuickApp2Form`.

## Non-goals

- Changing the max attachments input (it stays in the Advanced Settings popup, `application_advanced-settings`).
- Changing the model-driven process-files control (`QuickApp2Form.tsx:136`) or the Add attachment tool in Context and tools.
- Remembering previously selected types after the switch is turned OFF (the user picked the derived toggle).
- MIME format validation (the admin app has none).

## Alternatives considered

- *Keep the TagInput behind the toggle* (conservative baseline): smallest diff, but it doesn't match the design and keeps raw-MIME UX. Rejected by the user.
- *Predefined groups in a `Select`* (first pass, PDF/Images/Word → MIME groups): no custom values and a lossy two-way mapping. Replaced at the user's request by the admin-style input.
- *`Select` with an "Add …" row in its search*: keeps a kit component, but you can't type in the field itself and it doesn't match the admin UX. Rejected.
- *Persist a separate "attachments enabled" flag*: would need a new application field and chat-api shape change. Rejected; the toggle is derived from the existing data.

## Acceptance criteria

- The main column no longer renders User attachments. Configuration shows Attachments directly below Settings.
- An app with `inputAttachmentTypes: ["application/pdf"]` loads with the switch ON and an `application/pdf` tag. An app with none loads OFF with no field shown.
- Typing `gif` and pressing Enter adds `image/gif`. Typing `audio/mpeg` and pressing Enter adds `audio/mpeg`.
- An app saved with `["audio/mpeg", "image/*"]` shows both tags, and an untouched re-save keeps both values.
- Turning the switch OFF makes the form dirty (if types were set) and the next save omits attachment types or sends `[]`, the same as today's empty value.
- Read-only: the switch and input are disabled, and tags can't be removed.
- RTL: the switch sits at the logical end of the row; nothing is mirrored.

## Capabilities

### New Capabilities
- `application_user-attachments`: the Attachments switch and the Attachment types MIME tag input with suggestions in Configuration. Covers the suggestion list and keyboard behaviour, toggle state, required error, read-only, save mapping, accessibility and RTL.

### Modified Capabilities
- `application_editor-layout`: Configuration gains the Attachments row below Settings, and the main column no longer renders a User attachments section ("Configuration contains existing model controls", "Advanced Settings controls live only in the popup").

## Impact

- **Code:** new `src/components/Attachments/AttachmentsSection.tsx` (+ tests); `ModelConfigurationSection.tsx` (render below `SettingsSection`); `QuickApp2Form.tsx` (pass values/handler; drop `handleAttachmentTypesChange`); `QuickApp2FormLegacyFields.tsx` (drop `inputAttachmentTypes` from `LEGACY_FIELDS`, the section and the error bridge); `use-quick-app2-form.ts` (drop `SET_ATTACHMENT_TYPES` regex path and `attachmentTypesResetKey`); delete `src/components/UserAttachments/`. The field is ui-kit 2.0 `AutocompleteTagInput`, added to the kit for this change (epam/ai-dial-ui-kit#916, `@epam/ai-dial-ui-kit@^0.15.0-dev.42`). Suggestion data in `src/constants/attachment-types.ts`.
- **API / host / auth:** none. The chat-api update body keeps `inputAttachmentTypes` as `string[]` (`EditorClient.tsx:228`).
- **i18n:** new `quickAppEditor` keys: `Attachments`, `AttachmentsDescription`, `AttachmentTypesRequired`, `EnterAttachmentTypes` (placeholder), `AttachmentTypesCaption` and `RemoveAttachmentType`. `AttachmentTypes` is reused. Suggestion names (GIF, PDF, …) are format identifiers and aren't translated. `UserAttachments`, `UserAttachmentsDescription`, `InputMIMEType` and `PleaseMatchTheMimeFormat` are removed.
- **RTL:** the row uses `SectionRow` logical layout. The suggestion list uses symmetric `inset-x-0`, and `MenuItem` puts the MIME at the trailing edge. The switch and the tag-remove × are symmetric, so nothing is mirrored.
- **Rollback:** revert the commit. Saved data shape is unchanged in both directions.
