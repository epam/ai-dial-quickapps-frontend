Slicing strategy: **vertical**. First, Temperature works end to end through the popup draft and Save, and the inline slider is removed. Then process files follows the same path. Each slice is shippable on its own.

## 1. Contract, util and strings

- [x] 1.1 `src/types/advanced-settings.ts`: add `temperature: number` and `processLargeFiles: boolean` to `AdvancedSettingsValues`.
- [x] 1.2 `src/utils/application.ts`: add the arrow const `getTemperatureScaleLabelKey(value: number): QuickAppEditorI18nKeys`, returning `TemperaturePrecise` below `0.35`, `TemperatureCreative` above `0.65`, and `TemperatureNeutral` otherwise (design Decision 3). Unit-test it in `src/utils/tests/application.test.ts` (create the file if missing) for `0`, `0.3`, `0.4`, `0.5`, `0.6`, `0.7`, `1` and the float `0.1 + 0.2`.
- [x] 1.3 Add the `quickAppEditor` key `ProcessFilesOnDemandDescription` = "Handle attachments by reading file content on demand instead of including all attachment content in the initial prompt." to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` (the only locale file).
  - Verification: `npx vitest run src/utils/tests/application.test.ts`, `npm run lint`, `npm run typecheck`.

## 2. Slice 1: Temperature in the popup

- [x] 2.1 `src/components/QuickApp2Form.tsx`: add `temperature` to the `advancedSettings` `useMemo` and its dependency array. `handleAdvancedSettingsSave` stays `setValues(next)`.
- [x] 2.2 `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`: rename `showTemperatureSlider` to `isTemperatureAvailable` (keep the `useMemo`), remove the inline Temperature `SectionRow` and `Slider`, drop the `temperature` and `onTemperatureChange` props, and pass `isTemperatureAvailable` to `SettingsSection`. Stop passing the two props from `QuickApp2Form.tsx`.
- [x] 2.3 `src/components/Settings/SettingsSection.tsx`: add the `isTemperatureAvailable: boolean` prop to `SettingsSectionProps` and forward it to the popup.
- [x] 2.4 `src/components/Settings/AdvancedSettingsPopup.tsx`: add the `isTemperatureAvailable` prop and a `handleTemperatureChange` `useCallback` that updates the draft. When the prop is true, render the kit `Slider` as the first body child with:
  - `labelProps={{ label: t(Temperature) }}`, `min={0}`, `max={1}`, `step={0.1}`
  - `showTicks`, `showTooltip`, `formatValue={(v) => t(getTemperatureScaleLabelKey(v))}`
  - `rightContent` = an `aria-hidden` bordered `span` with `value.toFixed(1)`, using logical padding only (design Decision 4)

  Confirm the Slider props with `getEntityDetails("component", "Slider")` before coding.
- [x] 2.5 Tests:
  - `src/components/Settings/tests/AdvancedSettingsPopup.test.tsx`: slider first, named "Temperature" (`getByRole('slider', { name })`); bubble shows "Neutral" at `0.5` and "Precise" after ArrowLeft ×2; value input shows `0.3`; Close does not call `onSave`; Save calls `onSave` with `temperature: 0.3`; the slider is absent when `isTemperatureAvailable` is false, and Save still returns the seeded temperature.
  - `src/components/Settings/tests/SettingsSection.test.tsx`: forwards `isTemperatureAvailable`.
  - `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`: replace the inline-temperature cases with "no temperature slider in Configuration" and "passes temperature availability to Settings", covering unsupported, supported and not-loaded models.
  - Verification: `npx vitest run src/components/Settings src/components/Orchestrator/ModelConfigurationSection`, `npm run lint`, `npm run typecheck`, then `npm test`.

## 3. Slice 2: Allow orchestrator to process files in the popup

- [x] 3.1 `src/components/QuickApp2Form.tsx`: add `processLargeFiles` to the `advancedSettings` `useMemo` and its dependencies. Stop passing `processLargeFiles` and `onProcessLargeFilesChange` to `ModelConfigurationSection`.
- [x] 3.2 `ModelConfigurationSection.tsx`: remove the Process files `SectionRow` and `Switch`, drop those two props and the now-unused `Slider`/`Switch` imports, and forward `isProcessLargeFilesAvailable` to `SettingsSection`. `tooltip` stays for `DefaultModelBlock`.
- [x] 3.3 `SettingsSection.tsx`: add and forward `isProcessLargeFilesAvailable: boolean`.
- [x] 3.4 `AdvancedSettingsPopup.tsx`: add the `isProcessLargeFilesAvailable` prop and a `handleProcessLargeFilesChange` `useCallback`. When the prop is true, render a `Switch` after Built-in file tools with `labelProps.label = AllowOrchestratorToProcessFiles` and `caption = ProcessFilesOnDemandDescription`.
- [x] 3.5 Remove the `quickAppEditor` keys `ProcessFiles`, `ProcessFilesDescription` and `TemperatureDescription` from `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`, after confirming with grep that nothing else uses them. Keep any key that is still used.
- [x] 3.6 Tests:
  - `AdvancedSettingsPopup.test.tsx`: five controls in order with their labels and captions when both flags are true; only the three base controls when both are false; toggling process files then Close does not call `onSave`; Save calls `onSave` with `processLargeFiles` toggled.
  - `ModelConfigurationSection.test.tsx`: no process-files switch or "Process files" title in Configuration, and availability is forwarded.
  - `src/components/tests/QuickApp2Form.behavior.test.tsx`: saving the popup with a changed temperature or process files marks the form dirty; Close leaves it clean.
  - `src/form/tests/quickApp2Form.test.ts`: add a case only if serialization of `temperature` and `attachment_strategy` isn't already pinned.
  - Verification: `npx vitest run src/components/Settings src/components/Orchestrator/ModelConfigurationSection src/components/tests src/form/tests`, `npm run lint`, `npm run typecheck`, then `npm test`.

## 4. RTL and accessibility

- [x] 4.1 Confirm the touched Settings and ModelConfigurationSection files use only logical utilities (`ms/me`, `ps/pe`, `text-start`, `start/end`) and no icons. The value input uses kit field padding only.
- [x] 4.2 In `AdvancedSettingsPopup.test.tsx`, add a test that, with all controls shown, tab order is slider → temperature value input → max attachments → Time awareness → Built-in file tools → process files → footer actions, and the slider's `aria-valuetext` equals the bubble label.
  - Verification: `npx vitest run src/components/Settings`, `npm run lint`.

- [x] 4.3 `AdvancedSettingsPopup.tsx`: cap the popup at the design width with `className="md:max-w-[586px]"` (between the kit `Sm` 400px and `Md` 800px presets); assert it in `AdvancedSettingsPopup.test.tsx`, plus that the ticks come from `step` 0.1 (10 steps).
  - Verification: `npx vitest run src/components/Settings`.
- [x] 4.4 Make the temperature value an editable input. In `AdvancedSettingsPopup.tsx`, put a `w-12` `NumberInput` in `rightContent`, named by the new key `quickAppEditor.TemperatureValue`. It keeps the typed text until blur and commits `snapToStep` (new `src/utils/snap-to-step.ts`, tested in `src/utils/tests/snap-to-step.test.ts`). Add `MIN_TEMPERATURE` / `MAX_TEMPERATURE` / `TEMPERATURE_STEP` to `src/constants/quick-apps.ts`. Tests cover snapping, keeping the text while editing, Save, an empty input, and focus order.
  - Verification: `npx vitest run src/components/Settings src/utils/tests/snap-to-step.test.ts`, `npm run lint`, `npm run typecheck`.

- [x] 4.5 Add a max attachments placeholder: key `quickAppEditor.MaxAttachmentsPlaceholder` ("Enter the maximum number of attachments"), passed as `placeholder` in `AdvancedSettingsPopup.tsx` and tested in `AdvancedSettingsPopup.test.tsx`.
  - Verification: `npx vitest run src/components/Settings`.

## 5. Docs and specs

- [x] 5.1 `docs/TECH_DEBT.md`: in "Advanced settings", note that the popup now also holds Temperature and process files, and update any line that says these live under the orchestrator model-selection spec.
- [x] 5.2 Run `openspec validate move-model-controls-to-advanced-settings --strict` and make sure it passes.
  - Verification: `npm test`, `npm run lint`, `npm run typecheck`.

## 6. Follow-ups (out of scope)

- [ ] 6.1 Confirm the temperature scale bands with design (design Open Questions). Only `getTemperatureScaleLabelKey` thresholds would change.
- [ ] 6.2 Kit `Slider` RTL bug: the fill (`left-0`) and ticks (`style.left`) are physical while the native thumb flips. Fix it in `@epam/ai-dial-ui-kit`, not locally.
- [ ] 6.3 Once a ui-kit release with `Slider` `showValueInput` and the accent-focus ticks is installed, replace the popup's `rightContent` `NumberInput` with `showValueInput` + `valueInputAriaLabel`, and delete `src/utils/snap-to-step.ts`, its test and the duplicate draft-text state.
