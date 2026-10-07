Slicing strategy: **vertical** — first one control (Time awareness) works end to end through the popup draft and Save, then the other two are added, then the legacy controls are removed.

## 1. Contract and strings

- [x] 1.1 Add `AdvancedSettingsValues` interface (`maxInputAttachments?: number | ''`, `timestamp`, `fileTools`) in `src/types/advanced-settings.ts`.
- [x] 1.2 In `src/form/quickApp2Form.ts` export `MaxInputAttachmentsSchema` and add `isValidMaxInputAttachments` (arrow const, `safeParse`); unit-test it in `src/form/tests/quickApp2Form.test.ts` (empty → valid, `50` → valid, `0` / `-1` / `1.5` → invalid).
- [x] 1.3 Add `quickAppEditor` keys `MaxAttachmentsUserCanAdd`, `MaxAttachmentsHint`, `MaxAttachmentsInvalid`, `TimeAwarenessDescription`, `BuiltInFileTools`, `BuiltInFileToolsDescription` to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` (the only locale file).
  - Verification: `npx vitest run src/form/tests/quickApp2Form.test.ts`, `npm run lint`, `npm run typecheck`.

## 2. Slice 1 — Time awareness via popup draft

- [x] 2.1 `src/components/Settings/AdvancedSettingsPopup.tsx`: accept `advancedSettings: AdvancedSettingsValues` and `onSave: (values: AdvancedSettingsValues) => void`; keep a local draft seeded from props; render the Time awareness `Switch` (label + `caption` description); Save calls `onSave(draft)` then `onClose`; Close/× /dismiss only `onClose`. Remove the empty-body `bodyClassName` min-height.
- [x] 2.2 `src/components/Settings/SettingsSection.tsx`: take `advancedSettings` / `onAdvancedSettingsSave` props; mount the popup only while open so each open re-seeds the draft (design Decision 2).
- [x] 2.3 `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`: thread the two props to `SettingsSection`.
- [x] 2.4 `src/components/QuickApp2Form.tsx`: build `advancedSettings` with `useMemo` from `values`, `handleAdvancedSettingsSave` with `useCallback(setValues)`; pass them to `ModelConfigurationSection`. Remove `AdvancedSettingsSection` usage and the `<hr>` before it; delete `src/components/AdvancedSettings/` (component + test).
- [x] 2.5 Tests: rewrite `src/components/Settings/tests/AdvancedSettingsPopup.test.tsx` (seeded from props; toggling then Close does not call `onSave`; Save calls `onSave` with the edited draft and closes) and update `src/components/Settings/tests/SettingsSection.test.tsx` (reopen shows prop values, not a discarded draft).
  - Verification: `npx vitest run src/components/Settings`, `npm run lint`, `npm run typecheck`, then `npm test`.

## 3. Slice 2 — Built-in file tools and max attachments

- [x] 3.1 `AdvancedSettingsPopup.tsx`: add the max attachments `NumberInput` (first, `integer`, `min={1}`, label, hint as `caption`) and the Built-in file tools `Switch` (last); order input → Time awareness → file tools.
- [x] 3.2 Validate on Save with `isValidMaxInputAttachments`; on failure keep the popup open, set `invalid` + `error` = `MaxAttachmentsInvalid`, skip `onSave`; clear the error on next input change. If the form already has an `errors.maxInputAttachments` on open, show it.
- [x] 3.3 `src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx`: drop `fileTools` and `maxInputAttachments` from `LEGACY_FIELDS` and the `maxInputAttachments` branch of `attachmentErrors`.
- [x] 3.4 Remove the File tools `DialFormItem` from `src/components/ContextAndTools/ContextAndToolsSection.tsx` and the max attachments `DialFormItem` from `src/components/UserAttachments/UserAttachmentsSection.tsx` (Attachment types stays; drop now-unused imports/props).
- [x] 3.5 Remove i18n keys left without call sites: `FileTools`, `FileToolsDescription`, `AllowTheAgentToAccessAppFiles`, `MaxAttachmentsNumber`, `EnterMaxAttachments` (grep first; keep any still used).
- [x] 3.6 Tests: extend `AdvancedSettingsPopup.test.tsx` (three controls in order with labels/hints; `0` blocks Save with the invalid message; empty value saves as empty; file tools toggle saved); update `src/components/ContextAndTools/tests/ContextAndToolsSection.test.tsx`, `src/components/QuickApp2FormLegacyFields/tests/QuickApp2FormLegacyFields.test.tsx`, `src/components/tests/QuickApp2Form.test.tsx`, `src/components/tests/QuickApp2Form.behavior.test.tsx` (no moved controls in the main column; saving the popup marks the form dirty; Close leaves it clean). Add a `src/form/tests/quickApp2Form.test.ts` case pinning `timestamp`/`fileTools` → `features.timestamp`/`features.dial_files` (on and off, other features preserved) if not already covered.
  - Verification: `npx vitest run src/components/Settings src/components/ContextAndTools src/components/QuickApp2FormLegacyFields src/components/tests src/form/tests`, `npm run lint`, `npm run typecheck`, then `npm test`.

## 4. RTL and accessibility

- [x] 4.1 Popup body uses only logical utilities (`gap-*`, `ms/me`, `ps/pe`, `text-start`); no icons; confirm no physical `ml/mr/pl/pr/left/right/text-left` in the touched Settings files.
- [x] 4.2 Test in `AdvancedSettingsPopup.test.tsx` that the input is reachable by its label (`getByLabelText`) and switches by `getByRole('switch', { name })`.
  - Verification: `npx vitest run src/components/Settings`, `npm run lint`.

## 5. Docs and specs

- [x] 5.1 `docs/TECH_DEBT.md`: add `application_advanced-settings` row to the coverage matrix; mark the "Advanced settings" candidate as specified and point it to `src/components/Settings/**`; note in "User attachments" that max attachments moved to Advanced settings.
- [x] 5.2 `openspec validate populate-advanced-settings-popup --strict` passes.
  - Verification: `npm test`, `npm run lint`, `npm run typecheck`.
