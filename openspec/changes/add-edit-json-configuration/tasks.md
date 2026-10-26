# Tasks

Slicing strategy: contract-first for the split / compose mapping and the JSON helpers (group 1), then vertical slices through the UI (groups 2–3), docs and checks last.

## 1. Split / compose and JSON helpers (contract)

- [x] 1.1 Make `getQuickApp2FormData` return `extraConfig` (config minus the form-owned leaves of design decision 2, with item-level extras of decision 3), add the form-only `extraConfig` field to `QuickApp2Schema` / `QuickApp2FormValues` (`src/form/quickApp2Form.ts`, `src/types/quick-app-form.ts`), and make `buildQuickApp2Config` start from `data.extraConfig` and deep-merge the form values on top, with the applicability rules of decision 4 (no longer reading `existingConfig`); update the `EditorClient.tsx` and `QuickApp2Form.tsx` call sites. Verify in `src/form/tests`: a stored top-level key, `orchestrator.max_iterations`, `deployment.name` and `features.stage_display` survive load → save; `deployment.parameters` keeps `top_p`/`seed` with temperature on, with a model lacking temperature support (a stored `temperature` kept, none invented; `parameters` omitted when empty) and while the model is not loaded (loaded `parameters` unchanged); a skill of another `type`, a starter extra key and a non-file context survive; a form change beats a conflicting extra; `attachment_strategy` stays as stored for a model without attachments; `compose(split(config))` is stable after one pass; all existing `buildQuickApp2Config` / `getQuickApp2FormData` tests pass or are updated for the new carry-over.
- [x] 1.2 Add `src/utils/edit-json.ts` with `buildEditJsonDocument` (composed config + `input_attachment_types` / `max_input_attachments`, 2-space pretty print, no metadata) and `parseEditJsonDocument` (syntax → root object → document-shape zod schema → split → `QuickApp2Schema`) returning values (including the new `extraConfig`) or i18n-keyed errors; verify `src/utils/tests/edit-json.test.ts`: unsaved instruction edits and stored extras appear and metadata does not; syntax error, `[]` / `"x"`, wrong types (`tool_sets: 1`), empty instructions and unknown model are rejected with the expected keys; a valid document round-trips (`parse(build(values))` equals `values` apart from starter ids); an extra key typed in the JSON reaches `extraConfig` and one deleted from the JSON is absent.
- [x] 1.3 Add the i18n keys from design decision 8 to `src/constants/translation-keys.ts` and `src/i18n/locales/en.json` (reuse `ButtonsI18nKeys` Save / Cancel if present); verify `npm run typecheck` and the i18n key tests pass.

## 2. Entry point and popup

- [x] 2.1 Add `src/components/EditJson/EditJsonPopup/EditJsonPopup.tsx` (ui-kit `Popup`, lazy `DialJsonEditor` in `Suspense`, theme from `ThemeContext`, `dir="ltr"` editor, derived validation, `role="alert"` errors, Save disabled when invalid, Cancel / close / Escape discard); verify `tests/EditJsonPopup.test.tsx`: Save disabled + error for invalid text, enabled after fixing, Cancel does not call `onSave`, editor labelled, focus returns to the opener.
- [x] 2.2 Add `src/components/EditJson/EditJsonLink/EditJsonLink.tsx` (link-appearance button, `IconCode` with `DIAL_ICON_SIZE` / `DIAL_KIT_ICON_STROKE`) and the footer slot (divider, end-aligned, `mt-auto`) in `ModelConfigurationSection.tsx`; verify the section test renders the footer after all rows and, with `document.documentElement.dir = 'rtl'`, uses logical alignment.

- [x] 2.3 Align the popup with the Figma frame: wide dialog, bordered code box with a "JSON" header and copy / download icon buttons (`downloadTextFile` in `src/utils/file-download.ts`); verify `EditJsonPopup.test.tsx` and `file-download.test.ts` cover copy, clipboard failure and download.

## 3. Wire to the form

- [x] 3.1 In `QuickApp2Form.tsx` build the document when the popup opens and, on popup Save, `setValues(..., { shouldValidate: true })`, force host-disabled features off and reset `isMaxAttachmentsSeededRef`; verify `QuickApp2Form` tests: changing the model id and removing a skill in the JSON updates Default model and Skills; invalid JSON never reaches `setValues`; Code Interpreter stays off when the host setting is off; metadata untouched; saving the unchanged document leaves the form not dirty; Cancel leaves the form unchanged.
- [x] 3.2 Verify save-after-popup in `EditorClient` tests: values and extra keys typed in the JSON (`features.custom_flag`, `my_section`) are what is sent in the save request, with no extra chat-api call; a form edit after the popup does not drop them; a plain save with no popup keeps stored top-level extras.

## 4. Specs, docs and final checks

- [x] 4.1 Sync delta specs (`application_json-editor`, `application_editor-layout`, `application_editing`, `application_advanced-settings`) into `openspec/specs/` (`openspec-sync-specs`) and update `docs/TECH_DEBT.md`'s coverage matrix for `application_json-editor`; verify `openspec validate add-edit-json-configuration --strict` passes.
- [ ] 4.2 Run `npm run lint`, `npm run typecheck`, `npm test` (coverage thresholds) and `npm run build`; manually check light / dark and an RTL pass in the browser with the dev server.
