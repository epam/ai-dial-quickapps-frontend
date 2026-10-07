Slicing strategy: **vertical**. Slice 1 adds the pure mapping and strings (contract). Slice 2 moves the control end to end: new row, form wiring, old section removed. Slice 3 deletes the now-dead MIME-validation machinery. Slice 4 updates the docs. Each slice leaves the app building and the tests passing. Use extensionless relative imports throughout, keep `moduleResolution: "bundler"`, and use `@/*` aliases.

## 1. Slice 1 — Mapping contract and strings

- [x] 1.1 Add `src/constants/attachment-types.ts`: a string enum `AttachmentTypeOption` (`Pdf = 'pdf'`, `Images = 'images'`, `Text = 'text'`, `Word = 'word'`, `Excel = 'excel'`, `Csv = 'csv'`, `AllFiles = 'all-files'`), plus an ordered `ATTACHMENT_TYPE_OPTIONS` (`{ id, i18nKey, mimeTypes }[]`) with the MIME types from the `application_user-attachments` spec table. Put the item interface in `src/types/attachment-types.ts`.
  - **Verification:** `npm run typecheck`, `npm run lint`.
- [x] 1.2 Add `src/utils/attachment-types.ts` with arrow-const exports `getSelectedAttachmentOptions(mimeTypes)` and `getAttachmentMimeTypes(selectedValues)`, following design D2 (an option is selected only when all its MIME types are present; output is de-duplicated, in option order, unknowns last).
- [x] 1.3 Unit-test 1.2 in `src/utils/tests/attachment-types.test.ts`:
  - PDF only
  - Word → two MIME types
  - Images + PDF → option order
  - duplicates collapse
  - `["audio/mpeg","image/*"]` → Images + unknown `audio/mpeg`
  - lone `application/msword` → unknown, Word not selected
  - empty in, empty out
  - a round trip of a known set is stable
  - **Verification:** `npx vitest run src/utils/tests/attachment-types.test.ts`, `npm run lint`, `npm run typecheck`.
- [x] 1.4 Add the `quickAppEditor` i18n keys `Attachments`, `AttachmentsDescription`, `SelectAttachmentTypes`, `AttachmentTypesRequired`, `AttachmentTypePdf`, `AttachmentTypeImages`, `AttachmentTypeText`, `AttachmentTypeWord`, `AttachmentTypeExcel`, `AttachmentTypeCsv` and `AttachmentTypeAllFiles` to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` (the only locale file for the namespace), with the English copy from the spec and design.
  - **Verification:** `npm run typecheck`, `npm run lint`.

## 2. Slice 2 — Attachments row in Configuration (depends on 1)

- [x] 2.1 Create `src/components/Attachments/AttachmentsSection.tsx` (`memo`, props interface `AttachmentsSectionProps { value: string[]; isReadonly: boolean; onChange: (mimeTypes: string[]) => void }`):
  - `SectionRow` (Caption) with the title, the description, and a `Switch` as `action`
  - local `isEnabledWhileEmpty` state (D1) and a sticky unknown-MIME set (D3)
  - ui-kit 2.0 `Select` with `multiple`, a required label, a placeholder, and the presentational required error (D5), rendered only while the switch is on
  - `useMemo` options and `useCallback` handlers; no helpers in the component file
  - Before coding, confirm with ui-kit MCP `getEntityDetails` how `Switch` gets an accessible name and how `LabelProps` shows the required marker (D7). If needed, add an optional `headingId` prop to `src/components/common/SectionRow/SectionRow.tsx`.
- [x] 2.2 Component tests in `src/components/Attachments/tests/AttachmentsSection.test.tsx`, using role/label/text queries:
  - off with `[]` and no combobox
  - on with PDF selected for `["application/pdf"]`
  - turning off calls `onChange([])` and hides the field
  - turning on and then off with no selection never calls `onChange`
  - selecting Word emits both MIME types
  - an unknown MIME shows as a selected option and stays listed after it is removed
  - the required error appears when on and empty
  - disabled when read-only
  - **Verification:** `npx vitest run src/components/Attachments/tests/AttachmentsSection.test.tsx`, `npm run lint`, `npm run typecheck`.
- [x] 2.3 In `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`, add the props `inputAttachmentTypes` and `onInputAttachmentTypesChange` and render `AttachmentsSection` right after `SettingsSection`. Extend `tests/ModelConfigurationSection.test.tsx` to check that Attachments follows Settings.
- [x] 2.4 In `src/components/QuickApp2Form.tsx`, pass `values.inputAttachmentTypes` and a memoised `setField('inputAttachmentTypes', types, { shouldDirty: true, shouldValidate: true })`. Remove `handleAttachmentTypesChange` and the `onAttachmentTypesChange` prop.
- [x] 2.5 In `src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx`, remove `'inputAttachmentTypes'` from `LEGACY_FIELDS`, the `attachmentErrors` bridge, the `UserAttachmentsSection` render and its `<hr>`, and the `onAttachmentTypesChange` prop. Update `tests/QuickApp2FormLegacyFields.test.tsx`.
- [x] 2.6 Delete `src/components/UserAttachments/`. Update `src/components/tests/QuickApp2Form.test.tsx` and `QuickApp2Form.behavior.test.tsx`:
  - the main column has no User attachments section
  - Configuration has the Attachments switch
  - a loaded app with types submits the same `inputAttachmentTypes`
  - turning the switch off submits `[]`
  - **Verification:** `npx vitest run src/components/Orchestrator/ModelConfigurationSection src/components/QuickApp2FormLegacyFields src/components/tests src/components/Attachments`, `npm run lint`, `npm run typecheck`, then the full `npm test`.
- [x] 2.7 RTL check: the row uses only `SectionRow` logical layout, with no `ml-/mr-/pl-/pr-/left-/right-/text-left/right` classes in the new files, and no icon gets `rtl:scale-x-[-1]`. Add a test in `AttachmentsSection.test.tsx` that renders under `dir="rtl"` and asserts the switch and select are still present and operable.
  - **Verification:** `npx vitest run src/components/Attachments`, `npm run lint`.

## 3. Slice 3 — Remove dead MIME-validation path (depends on 2)

- [x] 3.1 In `src/hooks/use-quick-app2-form.ts`, remove the `SET_ATTACHMENT_TYPES` and `SET_ATTACHMENT_RESET_KEY` actions, `setAttachmentTypes`, `setAttachmentTypesResetKey` and `attachmentTypesResetKey` (state and result). Remove the matching cases from `src/hooks/tests/use-quick-app2-form.test.tsx`.
- [x] 3.2 Remove `MIME_TYPE_REGEX` from `src/form/quickApp2Form.ts` if a repo-wide grep finds no other importer. Remove the i18n keys `UserAttachments`, `UserAttachmentsDescription`, `InputMIMEType`, `EnterAttachmentTypes` and `PleaseMatchTheMimeFormat` from `src/constants/i18n.ts` and `quick-app-editor.json` if no call site remains.
  - **Verification:** `npx vitest run src/hooks/tests/use-quick-app2-form.test.tsx src/form/tests`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 4. Slice 4 — Docs

- [x] 4.1 In `docs/TECH_DEBT.md`, replace the "User attachments" candidate entry with a "Spec written (`openspec/specs/application_user-attachments`, from change `move-attachments-to-settings`)" note pointing at `src/components/Attachments/**`.
  - **Verification:** `npm run format:check`.

## 5. Slice 5 — Toggle and required error move into the form (revised D1/D5; depends on 2–3)

- [x] 5.1 In `src/form/quickApp2Form.ts`, add `attachmentsEnabled: z.boolean()` to `QuickApp2Schema`, seed it in `getQuickApp2FormData` as `inputAttachmentTypes.length > 0`, and add the `superRefine` issue on `inputAttachmentTypes` (message `QuickAppEditorI18nKeys.AttachmentTypesRequired`). Unit-test it in `src/form/tests/quickApp2Form.test.ts`: seeded true/false from load; enabled + empty → error; enabled + types, or disabled + empty → valid.
  - **Verification:** `npx vitest run src/form/tests`, `npm run lint`, `npm run typecheck`.
- [x] 5.2 Make `src/components/Attachments/AttachmentsSection.tsx` controlled: props `isEnabled`, `value`, `error`, `isReadonly`, `onEnabledChange`, `onChange`. Remove the local `isEnabledWhileEmpty` state and keep only the sticky unknown-option list. Render `t(error)`. Update `tests/AttachmentsSection.test.tsx`.
- [x] 5.3 Thread `attachmentsEnabled`, the `inputAttachmentTypes` error and the handlers through `ModelConfigurationSection.tsx` and `QuickApp2Form.tsx`: on → `setField('attachmentsEnabled', true)`, off → `setValues({ attachmentsEnabled: false, inputAttachmentTypes: [] })`. Extend `src/components/tests/QuickApp2Form.behavior.test.tsx`: enabled with no types blocks submit and host auto-save; selecting a type unblocks; on → off with no selection stays clean.
  - **Verification:** `npx vitest run src/components/Attachments src/components/Orchestrator/ModelConfigurationSection src/components/tests src/form/tests src/hooks/tests`, `npm run lint`, `npm run typecheck`, then the full `npm test`.


## 6. Slice 6 — Admin-style MIME tag input with suggestions (revised D2/D3; replaces the predefined-group select; depends on 5)

- [x] 6.1 Replace the option groups with suggestion data:
  - `src/types/attachment-types.ts`: an `AttachmentTypeSuggestion { name; mimeType }` interface; drop `AttachmentTypeOption` and the group types.
  - `src/constants/attachment-types.ts`: `ATTACHMENT_TYPE_SUGGESTIONS` = the admin list in spec order.
  - `src/utils/attachment-types.ts`: `getAttachmentTypeSuggestions(query, selected, limit = 5)` and `addAttachmentType(types, raw)`; drop the group mapping helpers.
  - Rewrite `src/utils/tests/attachment-types.test.ts`: name/MIME match, case-insensitivity, selected values excluded, limit 5, `image/` → GIF/PNG/JPG/TIFF/APNG, trim, duplicate and blank values ignored.
  - **Verification:** `npx vitest run src/utils/tests/attachment-types.test.ts`, `npm run lint`, `npm run typecheck`.
- [x] 6.2 i18n in `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`:
  - remove `SelectAttachmentTypes` and `AttachmentTypePdf…AttachmentTypeAllFiles`;
  - add `EnterAttachmentTypes` ("Enter attachment types"), `AttachmentTypesCaption` ("Choose from suggested MIME types or add a new one using <type>/<subtype>.") and `RemoveAttachmentType` ("Remove {{type}}").
- [x] 6.3 Create `src/components/AttachmentTypesInput/AttachmentTypesInput.tsx` per design D3: ui-kit `Input` with a `Tag` list in its content slot, plus a `role="listbox"` of `MenuItem` suggestions (name + trailing MIME), the combobox ARIA attributes and the keyboard handling from the spec. Use `memo` and memoised suggestions and handlers.
  - Tests in `src/components/AttachmentTypesInput/tests/AttachmentTypesInput.test.tsx` (role/label queries):
    - typing opens filtered suggestions, the first highlighted;
    - Enter adds the highlighted suggestion;
    - ArrowDown moves the highlight and wraps;
    - comma adds typed custom text;
    - a click on a suggestion adds it;
    - Escape closes the list;
    - blur doesn't add typed text;
    - Backspace on an empty input removes the last tag;
    - duplicates are ignored;
    - the tag remove button is named and removes the tag;
    - disabled hides remove controls and blocks typing;
    - `aria-expanded` / `aria-activedescendant` / `aria-controls` are wired;
    - it stays operable under `dir="rtl"`.
- [x] 6.4 Swap the `Select` in `src/components/Attachments/AttachmentsSection.tsx` for `AttachmentTypesInput` (passing `error`, `isReadonly`, `value`, `onChange`) and remove the sticky unknown-option state. Update `tests/AttachmentsSection.test.tsx` (mock `AttachmentTypesInput`; keep the switch, required-error and read-only cases).
  - **Verification:** `npx vitest run src/components/AttachmentTypesInput src/components/Attachments src/components/tests src/utils/tests/attachment-types.test.ts`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 7. Slice 7 — Use the kit's `AutocompleteTagInput` (revised D2/D3; depends on 6 and epam/ai-dial-ui-kit#916)

- [x] 7.1 Bump `@epam/ai-dial-ui-kit` to `^0.15.0-dev.42` in `package.json` / `package-lock.json`. Check the 0.15.0 CHANGELOG breaking changes: only the theme-variable rename applies, and the app doesn't use the old names.
- [x] 7.2 Reshape `src/constants/attachment-types.ts` into `AutocompleteTagInputSuggestion[]`. Delete `src/components/AttachmentTypesInput/`, `src/utils/attachment-types.ts` (+ test) and `src/types/attachment-types.ts`.
- [x] 7.3 Render `AutocompleteTagInput` in `src/components/Attachments/AttachmentsSection.tsx` with the props in design D3. Update `tests/AttachmentsSection.test.tsx` to mock the kit component and assert the label, required marker, placeholder, caption, tag-list label, translated remove label and suggestion shape.
  - **Verification:** `npx vitest run src/components/Attachments`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

