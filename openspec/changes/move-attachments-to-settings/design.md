## Context

Attachment types live in the main-column User attachments section (`src/components/UserAttachments/UserAttachmentsSection.tsx`). That section is a ui-kit `TagInput` wired through the react-hook-form legacy bridge (`QuickApp2FormLegacyFields.tsx:12-22,94-101,116-121`). Every typed tag is validated against `MIME_TYPE_REGEX` in the `SET_ATTACHMENT_TYPES` reducer branch (`use-quick-app2-form.ts:279-294`), and a rejected tag bumps `attachmentTypesResetKey` to remount the input. The value is a plain `string[]` that `EditorClient.tsx:228` copies into the app, and `dialClient.ts:400` sends it as `inputAttachmentTypes` in the chat-api update body. Load defaults it to `[]` (`dialClient.ts:355`, `quickApp2Form.ts:219`).

The design moves this control into Configuration (`ModelConfigurationSection.tsx`), directly after `SettingsSection`. It becomes a switch row that reveals a required attachment-types field.

*Revised during apply (user decisions):*
- The field matches the DIAL admin app's attachment-types input (`ai-dial-admin-frontend` `Common/AttachmentInput` → `Common/MultiValueAutocomplete`, MIME list in `EntityMainProperties/EntityAttachments/constants.ts`): typing in the field, suggestions shown as name … MIME, free-text entry, no format validation.
- This replaces the first-pass predefined-group multi-select (PDF/Images/Word → MIME groups).

## Goals / Non-Goals

**Goals:**
- Attachments row (title, description, switch) below Settings, plus a conditional MIME tag input with suggestions.
- A lossless round trip for any saved `inputAttachmentTypes`.
- Take `inputAttachmentTypes` off the RHF bridge and drop the MIME-regex / reset-key machinery.
- Write the `application_user-attachments` spec.

**Non-Goals:**
- No new persisted field and no chat-api change.
- No changes to max attachments (popup), process files, or the Add attachment tool.
- No MIME format validation (parity with admin).

## Decisions

### D1. Toggle = form-only `attachmentsEnabled` field
*Revised during apply (user decision): the toggle is part of the form refactor.*

`QuickApp2Schema` gains `attachmentsEnabled: z.boolean()`. `getQuickApp2FormData` seeds it as `inputAttachmentTypes.length > 0`. It is never serialized: `EditorClient` and `buildQuickApp2Config` pick fields explicitly, so it doesn't reach chat-api.
- Turning on: `setField('attachmentsEnabled', true)`.
- Turning off: `setValues({ attachmentsEnabled: false, inputAttachmentTypes: [] })`, in one update.
- On → off with no tags returns to the baseline, so the form isn't dirty. On alone is dirty (and invalid, see D5).
- `AttachmentsSection` is fully controlled (`isEnabled`, `value`, `error`, `onEnabledChange`, `onChange`) with no form state of its own.

*Rejected alternative (the original D1):* a local `isEnabledWhileEmpty` flag in the section. It kept the UI flag out of the schema, but the required error then couldn't be a form error, couldn't block save, and the toggle wasn't covered by the form's dirty/reset contract.

### D2. Value is the raw MIME list; suggestions are data
*Revised during apply.* `inputAttachmentTypes` is exactly the tag list, in entry order, with no mapping layer.

`src/constants/attachment-types.ts` exports `ATTACHMENT_TYPE_SUGGESTIONS: AutocompleteTagInputSuggestion[]` (`{ value: mimeType, label: name, description: mimeType }`). It holds the admin list in admin order, with names uppercased as in the design. The admin list's duplicate `xml-old → text/xml` entry is dropped. Names aren't translated: they're file-format identifiers, like the MIME strings beside them.

Filtering, trimming and de-duplication belong to the kit component (D3), so there's no local helper.

*Rejected:* the first-pass option groups. They needed a two-way mapping, an "unknown" bucket and sticky options, and couldn't express custom values.

### D3. The field is the kit's `AutocompleteTagInput`
*Revised during apply (user decision).* No 2.0 component offered typing with suggestions, so the combobox was first built locally from ui-kit `Input` + `Tag` + `MenuItem`. It was then moved into the kit as `AutocompleteTagInput` ([epam/ai-dial-ui-kit#916](https://github.com/epam/ai-dial-ui-kit/pull/916), `@epam/ai-dial-ui-kit@0.15.0-dev.42`). The local copy was then removed.

`AttachmentsSection` renders it when enabled, with:
- `suggestions={ATTACHMENT_TYPE_SUGGESTIONS}`, `value` and `onChange`;
- `labelProps` (label + `required`), `placeholder`, `caption`, `error` / `invalid` and `disabled`;
- `tagListLabel = t(AttachmentTypes)`;
- `getRemoveTagLabel = (type) => t(RemoveAttachmentType, { type })`, memoised.

The kit owns the behaviour in the spec:
- typing and the 5-item filtered list;
- Enter/comma, arrows, Escape/blur, Backspace;
- duplicates and blank text ignored;
- the combobox ARIA, and the floating list on the `z-floating` layer at the field's width;
- tags styled like the multiple `Select`.

### D4. Dirty state and ordering
Load doesn't rewrite `inputAttachmentTypes`, and edits only append or remove, so untouched apps stay clean and order is the user's own.

### D5. Required error is a schema error that blocks save
*Revised during apply (user decision).* `QuickApp2Schema.superRefine` adds an issue on `['inputAttachmentTypes']` with the message `QuickAppEditorI18nKeys.AttachmentTypesRequired` when `attachmentsEnabled && inputAttachmentTypes.length === 0`. The message value is the i18n key, and the section renders `t(error)`. `setField` / `setValues` validate by default, so the error appears as soon as the switch turns on. `handleSubmitForm` already returns early on `!isValid`, so both manual save and host auto-save are blocked with no extra code.

### D6. Form wiring
`QuickApp2Form` passes `values.attachmentsEnabled`, `values.inputAttachmentTypes`, `errors.inputAttachmentTypes` and memoised handlers (D1) through `ModelConfigurationSection` to `AttachmentsSection`. It removes `inputAttachmentTypes` from `LEGACY_FIELDS`, the `attachmentErrors` bridge and `UserAttachmentsSection`. It drops `setAttachmentTypes`, `SET_ATTACHMENT_TYPES`, `SET_ATTACHMENT_RESET_KEY` and `attachmentTypesResetKey` from `useQuickApp2Form`, along with their tests. `MIME_TYPE_REGEX` is removed (no format validation).

### D7. Row and switch
- **Row:** `SectionRow` (`variant=Setting`: 12/16 semibold primary title), with `title`, `description` and `action={<Switch isOn disabled onChange aria-label />}`.
- **Switch:** `Switch` forwards native input props, so `aria-label` names it.

### D8. States and RTL
- Loading: Configuration already renders after the form is seeded, so there's no separate loading state.
- Empty: switch off, nothing rendered below. With the switch on and no tags, the field shows the placeholder and the required error.
- No suggestions: the list is hidden.
- RTL: `SectionRow` uses flex `justify-between`, `MenuItem` puts `description` at the trailing edge, and the list uses `inset-x-0`. No icons are mirrored.

## Risks / Trade-offs

- [No format validation, so a typo such as `imagepng` is saved as-is] → parity with admin; the caption shows the expected `<type>/<subtype>` form.
- [Admin list includes non-standard types (`application/html`, `application/csv`, `text/json`)] → kept for parity; suggestions are only suggestions.
- [Auto-save silently skips while the Attachments field is enabled but empty] → the inline required error is the feedback, as with any other invalid field.

## Migration Plan

No data migration. Deploy is a normal frontend release, and rollback is a revert. The saved shape is identical, so either version reads data written by the other.

## Open Questions

- None. Copy follows the admin app: caption "Choose from suggested MIME types or add a new one using <type>/<subtype>.", placeholder "Enter attachment types".
