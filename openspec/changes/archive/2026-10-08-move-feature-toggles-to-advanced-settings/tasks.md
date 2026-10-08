# Tasks

Slicing: vertical — popup first (works end to end), then remove the legacy card.

## 1. Popup switches

- [x] 1.1 Add `codeInterpreter`, `addAttachment`, `webFetch` to `AdvancedSettingsValues` (`src/types/advanced-settings.ts`); include them in the `advancedSettings` memo in `src/components/QuickApp2Form.tsx` and pass `isCodeInterpreterEnabled`/`isAddAttachmentEnabled`/`isWebFetchEnabled` through `ModelConfigurationSection` and `SettingsSection` to `AdvancedSettingsPopup`.
- [x] 1.2 Render the three conditional `Switch`es (label = `CodeInterpreter`/`AddAttachment`/`WebFetch`, caption = `CodeInterpreterInfo`/`AddAttachmentDescription`/`WebFetchDescription`) after the process-files switch in `src/components/Settings/AdvancedSettingsPopup.tsx`, with draft handlers.
- [x] 1.3 Extend `src/components/Settings/tests/AdvancedSettingsPopup.test.tsx` (visibility per setting, copy, order, draft discard, Save payload, role/name queries) and update `SettingsSection.test.tsx`, `ModelConfigurationSection.test.tsx` and `src/components/tests/QuickApp2Form.behavior.test.tsx` for the new props.
  - **Verification:** `npx vitest run src/components/Settings src/components/Orchestrator src/components/tests/QuickApp2Form.behavior.test.tsx`; `npm run lint`; `npm run typecheck`.

## 2. Remove the Context & Tools card

- [x] 2.1 Delete `src/components/ContextAndTools/` and `src/components/QuickApp2FormLegacyFields/` (with tests); remove their render, `handleLegacyValuesChange` and imports from `src/components/QuickApp2Form.tsx`; update `QuickApp2Form.test.tsx` / `.behavior.test.tsx` expectations that referenced the card.
- [x] 2.2 Remove `ContextAndTools`, `ContextAndToolsDescription`, `UseToExecuteCustomPythonCode`, `AllowTheAgentToAttachFilesToTheResponse`, `AllowTheAgentToFetchWebResources` from `src/constants/i18n.ts` and the `Context & Tools` entry from `src/i18n/locales/quick-app-editor.json`.
  - **Verification:** `npx vitest run src/components src/hooks/tests/use-quick-app2-form.test.tsx`; `grep` shows no remaining `ContextAndTools`/`QuickApp2FormLegacyFields` in `src/`; `npm run lint`; `npm run typecheck`.

## 3. Docs

- [x] 3.1 Update `docs/TECH_DEBT.md` (lines ~13-14), `openspec/changes/remove-react-hook-form/tasks.md` (item 4.1 and the legacy-fields bullet) and the Purpose line of `openspec/specs/application_advanced-settings/spec.md` to reflect that no RHF section remains.
  - **Verification:** `openspec validate move-feature-toggles-to-advanced-settings --strict`; run full `npm test` and `npm run build` once.
