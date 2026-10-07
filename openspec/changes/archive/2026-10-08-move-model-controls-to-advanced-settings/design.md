## Context

`ModelConfigurationSection.tsx` renders the Temperature `Slider` and the Process files `Switch` inline, between the Default model block and the Settings row. Both write straight to the form through `setField`, called from `QuickApp2Form.tsx:250-253`. Each has its own visibility rule:

- Temperature uses `showTemperatureSlider`, a `useMemo` over `doesModelAllowTemperature(modelsMap[model])`. It is `true` when the model isn't loaded yet.
- Process files uses `isProcessLargeFilesAvailable`, computed in `QuickApp2Form.tsx:136` as `!!modelsMap[values.model]?.inputAttachmentTypes?.length`.

`AdvancedSettingsPopup.tsx` already follows a draft-and-Save pattern. `SettingsSection` mounts it only while it is open, so each open re-seeds the draft. The draft is typed `AdvancedSettingsValues` (`src/types/advanced-settings.ts`). `QuickApp2Form` builds that object with `useMemo` (line 170) and saves it with `setValues(next)`, whose `isEqual` check keeps an unchanged Save clean.

The ui-kit is at `0.15.0-dev.49`. Its 2.0 `Slider` supports `labelProps`, `showTooltip`, `showTicks`, `formatValue` (which drives both the tooltip text and `aria-valuetext`), and `rightContent`, which renders after the track and is centred on it.

## Goals / Non-Goals

**Goals:**
- Render Temperature and Allow orchestrator to process files inside the popup in the mockup order, with the same visibility rules.
- Bring both into the existing draft: seeded on open, applied in one `setValues` call on Save, discarded on Close.
- Remove them from Configuration.

**Non-Goals:**
- Changing the form schema, defaults, serialization (`buildQuickApp2Payload`) or any chat-api call.
- Adding a read-only hint inside the popup. The Advanced action is already disabled when the editor is read-only, so the popup cannot open in that state.

## Decisions

1. **Extend `AdvancedSettingsValues` instead of adding a second draft.** We add `temperature: number` and `processLargeFiles: boolean` to the interface, the `useMemo` in `QuickApp2Form`, and the popup draft. `handleAdvancedSettingsSave` stays `setValues(next)`. *Alternative:* separate props plus callbacks for the two controls. Rejected, because it would split Save into several updates and duplicate the draft logic.

2. **Visibility flags are props, computed where the data lives.** `ModelConfigurationSection` keeps its `showTemperatureSlider` `useMemo` (renamed `isTemperatureAvailable`) and passes it with the existing `isProcessLargeFilesAvailable` down `SettingsSection` → `AdvancedSettingsPopup` as `isTemperatureAvailable` / `isProcessLargeFilesAvailable`. The popup does not read `DataContext`, so it stays a presentational component that is easy to test. Hidden controls keep their seeded draft value, so Save writes them back unchanged.

3. **The temperature label comes from a pure util.** `getTemperatureScaleLabelKey(value)` in `src/utils/application.ts`, next to `doesModelAllowTemperature`, returns a `QuickAppEditorI18nKeys` member:
   - `value < 0.35` → `TemperaturePrecise`
   - `value > 0.65` → `TemperatureCreative`
   - otherwise → `TemperatureNeutral`

   The half-step thresholds avoid floating-point edge cases at 0.3, 0.4, 0.6 and 0.7. The popup passes `formatValue={(v) => t(getTemperatureScaleLabelKey(v))}` together with `showTooltip` and `showTicks`, so the bubble shows "Neutral" and screen readers hear the same word. `aria-valuenow` still carries the number. The bands are an assumption read from the mockup: "Neutral" at 0.5, with three equal-ish thirds. See Open Questions.

4. **The value is a compact, editable `NumberInput`.** This was revised during implementation: it started as a read-only `span`. The ui-kit `Slider` gains `showValueInput` (a synced, step-snapped `NumberInput` after the track) together with this change. Until a kit release with it is installed, the popup duplicates that behaviour in `rightContent`: a `w-12` `NumberInput` named `TemperatureValue` keeps the typed text while focused and commits `snapToStep(value, 0, 1, 0.1)` (`src/utils/snap-to-step.ts`) to the draft. Once the kit ships it, swap `rightContent` for `showValueInput` and delete the duplicate. *Alternative:* `showValue`. Rejected, because the mockup shows the value in a field after the track, not on the label row.

5. **Copy.** The switch uses `labelProps.label = AllowOrchestratorToProcessFiles` and `caption = ProcessFilesOnDemandDescription`, a new key with the shorter text from the mockup, the same pattern as the Time awareness switch. We remove `ProcessFiles`, `ProcessFilesDescription` and `TemperatureDescription` after confirming with grep that nothing else uses them. `TemperaturePrecise`, `TemperatureNeutral` and `TemperatureCreative` are reused.

6. **Clean up `ModelConfigurationSection`.** Its `temperature`, `onTemperatureChange`, `processLargeFiles` and `onProcessLargeFilesChange` props are removed, together with the `Slider` and `Switch` imports. `tooltip` stays because `DefaultModelBlock` still uses it. `QuickApp2Form` stops passing the removed props.

States: the popup has no loading, empty or error states of its own. Model data loading is already covered by the "not loaded" visibility rules above, and validation errors apply only to max attachments, as today.

RTL: the kit Slider and Switch handle direction internally, the value input comes after the track in DOM order, and the body uses only logical utilities. There are no icons.

## Risks / Trade-offs

- [Users used to the inline slider now need two extra clicks, and edits only apply on Save] → This is the design's intent. The popup's Save/Close contract matches the other advanced settings.
- [The kit Slider may not mirror its fill and thumb under `dir="rtl"`] → Add an RTL render test asserting the value input and slider render without physical-direction classes in our code. If the kit doesn't mirror, file it upstream to the ui-kit rather than patching it locally.
- [`formatValue` replaces the numeric `aria-valuetext` with a word] → `aria-valuenow` still exposes the number. This is accepted as matching the visible bubble.
- [Hidden-control values written back on Save] → They are the seeded form values, so `isEqual` keeps dirty state correct. A test covers this.

## Migration Plan

This is UI only, with no data change. To roll back, revert the change's commit.

## Open Questions

- Scale bands for the bubble label (Precise ≤ 0.3, Neutral 0.4–0.6, Creative ≥ 0.7) are inferred from the mockup. Confirm with design. Only the util's thresholds would change.

## Addenda (during implementation)

- **Popup width.** The design frame is ~586px. That falls between the kit's `PopupSize.Sm` (`md:max-w-[400px]`) and `Md` (`md:max-w-[800px]`), so the popup keeps `Sm` and passes `className="md:max-w-[586px]"`. The kit merges `className` after the size class with tailwind-merge, so the override wins. Below `md` it stays `max-w-full`.
- **Ticks are owned by the kit.** The ui-kit `Slider` now draws one tick per step after `min`, so `0..1` at `0.1` gives exactly 10 (it used to draw 11, including one always hidden under the thumb). The ticks use the `Controls/Stroke/Accent-focus` token. This app does not override tick styling. The mockup frame draws a finer 0.05 grid. We intentionally do not copy it, because ticks must match the 0.1 step.
