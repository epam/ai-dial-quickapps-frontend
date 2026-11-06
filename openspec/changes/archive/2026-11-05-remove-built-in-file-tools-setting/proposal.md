## Why

The backend now exposes the read-only DIAL file tools by default when `features.dial_files` is
absent ([ai-dial-quickapps-backend#710](https://github.com/epam/ai-dial-quickapps-backend/pull/710)).
The backend owns a sensible default, so the editor no longer needs a "Built-in file tools" setting.
Worse, the editor's current default (`true` → `dial_files: {}`) means *all 10 tools including
write/edit/delete* on the backend, which is broader than the new backend default. See issue
[#332](https://github.com/epam/ai-dial-quickapps-frontend/issues/332).

## What Changes

- Remove the "Built-in file tools" switch and its description from the Advanced Settings popup.
- Remove the `fileTools` form field and its load/save mapping (`src/form/quick-app-form-data.ts`,
  `src/form/quick-app-form-schema.ts`, `src/form/build-quick-app-config.ts`, the form/popup types and
  the draft plumbing in `QuickApp2Form.tsx`).
- Stop writing `features.dial_files`. A new application is saved with no `features.dial_files` key,
  so the backend default applies.
- `features.dial_files` stops being a form-owned path (`src/utils/quick-app-extra-config.ts`): it
  becomes part of the extra config, so any value already stored on an existing application is kept
  as loaded and never overwritten or nulled on save.
- Remove the unused i18n keys `AdvancedSettingsBuiltInFileTools` and
  `AdvancedSettingsBuiltInFileToolsDescription` (`en.json` + `translation-keys.ts`).
- **BREAKING (behavior):** users can no longer turn the file tools on or off from the editor. An
  existing app that has `dial_files` set is not changed; to change it, use Edit JSON.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_advanced-settings`: popup content and order, draft seed, Save, the persisted field
  mapping (`fileTools` removed, `dial_files` preserved), defaults on load, focus order, and the
  Process files switch's position.
- `application_editor-layout`: the form-state-on-Save scenario and the "controls live only in the
  popup" scenario no longer mention Built-in / File tools.
- `application_editing`: "Application properties written on save" — `features` no longer sets
  `dial_files`; the loaded value is carried over.

## Impact

- **Code:** `src/form/*`, `src/types/{quick-app-form,advanced-settings}.ts`,
  `src/components/Settings/AdvancedSettingsPopup/AdvancedSettingsPopup.tsx`,
  `src/components/QuickApp2Form/QuickApp2Form.tsx`, `src/utils/quick-app-extra-config.ts`,
  `src/constants/translation-keys.ts`, `src/i18n/locales/en.json`, and the tests that reference
  `fileTools`. `src/types/quick-apps.ts` keeps `dial_files?` in the saved-config type.
- **API / chat-api:** same endpoint and body shape; `features.dial_files` is simply absent for new
  apps and untouched for existing ones.
- **Docs:** `docs/quickapps-migration-guide.md` and `docs/TECH_DEBT.md` mention the switch.
- **i18n:** two keys removed, none added. **RTL:** none (a control is removed).
- **Out of scope:** auth, host integration and the API layer are not touched.
- **Dependency:** backend PR #710 must be released first; otherwise an app without the block would
  have no file tools.
- **Rollback:** revert the commit. Stored `dial_files` values are never rewritten, so nothing needs
  migrating.
- **Alternatives considered:** keep the switch but default it off (rejected: still writes the key and
  keeps UI for a backend-owned default); strip an existing `dial_files` on save (rejected: silently
  changes saved apps).
