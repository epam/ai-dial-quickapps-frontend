# Tasks

## 1. Translation and popup vertical slice

- [x] 1.1 Add the `quickAppEditor` keys `Settings`, `Advanced`, `Close`, `Save`, and `CloseAdvancedSettings` to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`, preserving the existing `AdvancedSettings` value used by the legacy section.
  - **Verification:** Run `npm test -- src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`, `npm run lint`, and `npm run typecheck`; confirm the existing Configuration test remains green and the new translation enum/resource compile.
- [x] 1.2 Create `src/components/Settings/AdvancedSettingsPopup.tsx` using the installed UI-kit `Popup` and current button primitives, with a translated header, localized close name, responsive blank body, and Close/Save footer actions that only invoke the supplied close callback. Add `src/components/Settings/tests/AdvancedSettingsPopup.test.tsx` covering the dialog name, empty body, keyboard-reachable shell actions, and no persistence callback.
  - **Verification:** Run `npm test -- src/components/Settings/tests/AdvancedSettingsPopup.test.tsx`, `npm run lint`, and `npm run typecheck`; verify the test observes a dialog with no body controls and both footer actions close it.

## 2. Configuration entry point and direction-aware slice

- [x] 2.1 Create `src/components/Settings/SettingsSection.tsx` with named props and local `isPopupOpen` state, render the translated Settings row and UI-kit Advanced trigger with a symmetric settings icon, pass `isReadonly` through to the trigger, and compose `AdvancedSettingsPopup`. Add `src/components/Settings/tests/SettingsSection.test.tsx` for the visible row, open interaction, disabled read-only interaction, and form-state neutrality.
  - **Verification:** Run `npm test -- src/components/Settings/tests/SettingsSection.test.tsx`, `npm run lint`, and `npm run typecheck`; verify enabled activation shows the popup and read-only activation does not.
- [x] 2.2 Audit and, if needed, adjust the Settings row and popup classes in `src/components/Settings/SettingsSection.tsx` and `src/components/Settings/AdvancedSettingsPopup.tsx` to use logical spacing/alignment and viewport-safe sizing; extend `src/components/Settings/tests/SettingsSection.test.tsx` with RTL/document-direction and narrow-layout class assertions while leaving the settings icon unmirrored.
  - **Verification:** Run `npm test -- src/components/Settings/tests/SettingsSection.test.tsx`, `npm run lint`, and `npm run typecheck`; assert no new physical directional utilities are used and RTL assertions pass.
- [x] 2.3 Integrate `SettingsSection` after the existing controls in `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`, passing its current `isReadonly` contract without altering model, temperature, or process-files branches; update `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx` to assert the row is composed and existing read-only/control-visibility behavior remains intact.
  - **Verification:** Run `npm test -- src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`, `npm run lint`, and `npm run typecheck`; verify the legacy `src/components/AdvancedSettings/AdvancedSettingsSection.tsx` is unchanged and all existing Configuration controls still render.

## 3. Integration quality checks

- [x] 3.1 Run the complete Vitest suite and production checks for the finished vertical slice, including the Quick App layout coverage in `src/components/tests/QuickApp2Form.test.tsx`, and resolve only failures caused by this change.
  - **Verification:** Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`; all commands must pass with no chat-api or host-integration code changes.
