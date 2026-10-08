## Why

The Configuration area still shows the Temperature slider and the Process files block inline under the Default model, while the other tuning settings (max attachments, Time awareness, Built-in file tools) live in the Advanced Settings popup. The new design (Advanced Settings mockup) moves both orchestrator controls into that popup. Configuration then holds only the model, the Settings row and the Attachments row, and every advanced setting is edited in one place with the same draft-and-Save behaviour.

## What Changes

- **Advanced Settings popup gains two controls.** Body order becomes: **Temperature** slider → max attachments → Time awareness → Built-in file tools → **Allow orchestrator to process files** switch.
- **Temperature in the popup** uses the kit 2.0 `Slider` with its label above the track ("Temperature"), tick marks at every step, a bubble above the thumb that shows the scale label for the current value (Precise / Neutral / Creative), and the numeric value (`0.5`) in a compact, editable number input after the track. Same range (`0`–`1`, step `0.1`), same `temperature` form field, and the same rule that hides it when the selected model's `features.temperature` is not `true`. The inline description `TemperatureDescription` and the labels under the track are not shown in the popup.
- **Process files in the popup** is a `Switch` labelled "Allow orchestrator to process files", with a new, shorter caption: "Handle attachments by reading file content on demand instead of including all attachment content in the initial prompt." The "Process files" block title is dropped. Same `processLargeFiles` form field, and it still shows only when the selected model has a non-empty `inputAttachmentTypes`.
- **Draft-and-Save now covers both controls.** Changes to temperature or process files only reach the form when the user clicks Save. Close or dismiss discards them, just like the existing popup controls. **Behaviour change:** before, these controls wrote to the form immediately.
- **Configuration loses the inline Temperature and Process files blocks.** Configuration becomes: Default model → Settings row → Attachments row.
- **Persistence is unchanged.** `orchestrator.deployment.parameters.temperature` and `orchestrator.attachment_strategy` are serialized exactly as today through the existing application update.

Non-goals: changing the temperature range or default, changing the attachment-strategy payload, and any other popup control.

Alternatives considered: (a) keep the controls inline and only restyle them, which ignores the design; (b) move them into the popup but keep writing to the form live, which would make two popup controls ignore Close and break the popup's existing contract. We picked a full move with draft-and-Save.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `application_advanced-settings`: the popup lists and drafts Temperature and Allow orchestrator to process files, including visibility rules, copy, slider presentation, Save and persistence.
- `orchestrator_model-selection`: the Temperature control and Process files control requirements are removed from the Configuration area (they now belong to `application_advanced-settings`). The purpose line is narrowed to the model block and picker.
- `application_editor-layout`: Configuration no longer contains the temperature and process-files controls. The "popup changes form state only on Save" requirement now explicitly covers temperature and process files.

## Impact

- **Code:** `src/components/Settings/AdvancedSettingsPopup.tsx`, `src/components/Settings/SettingsSection.tsx`, `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`, `src/components/QuickApp2Form.tsx` (builds `advancedSettings` at `src/components/QuickApp2Form.tsx:170`), `src/types/advanced-settings.ts`, plus their tests. The existing pattern being extended is the popup draft at `src/components/Settings/AdvancedSettingsPopup.tsx:36`. There is no new context, hook or API.
- **API / chat-api:** none. Saving still goes through the existing application update (`updateApplicationBodyDto`). This change does not touch auth, host integration or the API layer.
- **i18n:** adds one new `quickAppEditor` string, `ProcessFilesOnDemandDescription`. It reuses `Temperature`, `TemperaturePrecise`/`Neutral`/`Creative` and `AllowOrchestratorToProcessFiles`. `ProcessFiles`, `ProcessFilesDescription` and `TemperatureDescription` lose their call sites and are removed.
- **RTL:** the slider and switch come from the kit. The popup body keeps logical utilities only. The value input sits on the logical end side (`rightContent` renders after the track in DOM order, so it follows `dir`). There are no directional icons.
- **Backward compatibility / rollback:** no data-shape change. Revert the commit to restore the inline controls. Saved applications are unaffected.

## Acceptance criteria

- Configuration shows only Default model, Settings and Attachments, with no inline Temperature or Process files.
- The popup shows the five controls in the mockup order, with Temperature and process files appearing under the same conditions as before.
- Changing temperature or process files and then closing the popup leaves the form unchanged and clean. Saving applies the change, marks the form dirty, and the next editor save sends the same payload as today.
- The tests in the tasks pass, along with `npm run lint`, `npm run typecheck` and `npm test`.
