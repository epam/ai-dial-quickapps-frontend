# Tasks

Slicing: vertical. Group 1 removes the setting end to end (form, builder, popup, i18n) with its
tests; group 2 syncs the specs and docs.

## 1. Remove the setting and stop writing `dial_files`

- [x] 1.1 Remove `fileTools` from `src/types/quick-app-form.ts`, `src/types/advanced-settings.ts`,
  `src/form/quick-app-form-schema.ts`, the default in `src/form/quick-app-form-data.ts`, and the
  `dial_files` line in `src/form/build-quick-app-config.ts`. Verify:
  `src/form/tests/quick-app-form.test.ts` and `src/hooks/tests/use-quick-app2-form.test.tsx`
  pass, and a built config for a new app has no `features.dial_files` key.
- [x] 1.2 Remove `'features.dial_files'` from `FORM_OWNED_PATHS` in
  `src/utils/quick-app-extra-config.ts`. Add tests that `{}`, `{ enabled_tools: [...] }` and `null`
  stored values are saved unchanged and that a new app has no key. Verify:
  `src/form/tests/quick-app-form-extra-config.test.ts`, `src/utils/tests/edit-json.test.ts`,
  `src/utils/tests/edit-json-form-correlation.test.ts`.
- [x] 1.3 Remove the switch, `handleFileToolsChange` and draft field from
  `src/components/Settings/AdvancedSettingsPopup/AdvancedSettingsPopup.tsx`, and the
  `fileTools` plumbing at `src/components/QuickApp2Form/QuickApp2Form.tsx:186,194`. Update
  `AdvancedSettingsPopup/tests`, `SettingsSection/tests`, `QuickApp2Form.behavior.test.tsx` and
  `ModelConfigurationSection/tests` (focus order, switch count, no file tools switch). Verify those
  test files pass.
- [x] 1.4 Delete `AdvancedSettingsBuiltInFileTools` and `AdvancedSettingsBuiltInFileToolsDescription`
  from `src/constants/translation-keys.ts` and `builtInFileTools*` from `src/i18n/locales/en.json`.
  Verify: `grep -rn "BuiltInFileTools\|builtInFileTools\|fileTools" src` returns nothing.
- [x] 1.5 Run `npm run lint`, `npm run build` and the full `npm test` once. Verify all pass.

## 2. Specs and docs

- [x] 2.1 Edit the `## Purpose` of `openspec/specs/application_advanced-settings/spec.md` (not
  covered by a delta) to drop "Built-in file tools switch" and `fileTools`. Verify with
  `grep -n "ile tools" openspec/specs/application_advanced-settings/spec.md`.
- [x] 2.2 Update `docs/quickapps-migration-guide.md:376` and `docs/TECH_DEBT.md:283` to stop
  listing the switch. Verify with `grep -rn "ile tools" docs`.
- [x] 2.3 Run `openspec validate remove-built-in-file-tools-setting --strict`. Verify it passes.

## Workflow follow-up

- Sync/archive the change after review (`openspec-sync-specs` / `openspec-archive-change`).
- After `keep-translations-on-save-without-general` is archived, change the `"dial_files": null`
  line in the "Save request" example of `application_editing` (remove it).
- Release order: backend PR #710 must be deployed before this ships.
