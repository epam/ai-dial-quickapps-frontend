# Tasks

Slicing: vertical (form logic first, then popup, then integration checks).

## 1. Form logic

- [x] 1.1 Add `DEFAULT_MAX_INPUT_ATTACHMENTS = 1` to `src/constants/quick-apps.ts` and `MaxAttachmentsRequired = 'Maximum attachments amount is required'` to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts`. Verify: `npm run typecheck`.
- [x] 1.2 In `src/form/quickApp2Form.ts`: add a required-aware `isValidMaxInputAttachments(value, isRequired)`, a `superRefine` issue on `maxInputAttachments` when `attachmentsEnabled` and empty, and default seeding in `buildFormValues` with host-value normalisation (numeric string → number; `0`, negative, decimal, `null` → missing) for apps with types. Verify: update/add cases in `src/form/tests/quickApp2Form.test.ts` (required when enabled, optional when disabled, legacy seed, host value `0`/`null`/`"3"`/`2.5`) and run it.
- [x] 1.3 In `src/components/QuickApp2Form/QuickApp2Form.tsx`: rewrite `handleAttachmentsEnabledChange` (seed when empty on enable, keep max on disable, revert a toggle-seeded value on disable via a ref, clear the ref in `handleAdvancedSettingsSave` and on a valid submit). Verify: add tests in `src/components/QuickApp2Form/tests/QuickApp2Form.behavior.test.tsx` for seed-on-enable, set 5 → off → on keeps 5, on → off not dirty, legacy load not dirty, existing max kept on enable, seeded max kept after save then off (marker cleared on valid submit), popup-confirmed `1` kept on off, read-only editor unchanged; run it.

## 2. Popup

- [x] 2.1 Pass `isAttachmentsEnabled` into `AdvancedSettingsPopup` through `ModelConfigurationSection.tsx` and `SettingsSection.tsx`; in `AdvancedSettingsPopup.tsx` use the required-aware check in `handleSave` and show `MaxAttachmentsRequired` for empty vs `MaxAttachmentsInvalid` for non-positive. Verify: update `src/components/Settings/AdvancedSettingsPopup/tests/AdvancedSettingsPopup.test.tsx` (empty save with attachments off saves empty, around lines 238/274; empty with attachments on shows the required error and keeps the popup open; `0` shows the invalid message) and `src/hooks/tests/use-quick-app2-form.test.tsx` if affected; run them.

## 3. Integration

- [x] 3.1 Run `npm run lint`, `npm run typecheck` and the full `npm test`. Verify: all pass.
- [x] 3.2 Run `openspec validate require-max-attachments-when-enabled --strict`. Verify: passes. After review, sync/archive into `openspec/specs/` via `openspec-sync-specs` / `openspec-archive-change`.
