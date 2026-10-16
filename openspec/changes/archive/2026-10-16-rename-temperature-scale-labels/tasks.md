Slicing: vertical. One slice: keys, label helper and tests together, since the swap is atomic.

## 1. Translation keys

- [x] 1.1 In `src/i18n/locales/en.json` add `applicationEditor.advancedSettings.temperatureCold` ("Cold") and `applicationEditor.advancedSettings.temperatureHot` ("Hot"). Remove `chatSettings.temperaturePrecise` and `chatSettings.temperatureCreative`.
- [x] 1.2 In `src/constants/translation-keys.ts` add `ApplicationEditorI18nKeys.AdvancedSettingsTemperatureCold` / `AdvancedSettingsTemperatureHot`. Remove `ChatSettingsI18nKeys.TemperaturePrecise` / `TemperatureCreative`.

## 2. Label helper

- [x] 2.1 In `src/utils/application.ts`, make `getTemperatureScaleLabelKey` return `AdvancedSettingsTemperatureCold` below `0.35` and `AdvancedSettingsTemperatureHot` above `0.65`. Keep `ChatSettingsI18nKeys.TemperatureNeutral` in between. Widen the return type to `ApplicationEditorI18nKeys | ChatSettingsI18nKeys`.

## 3. Tests

- [x] 3.1 Update `src/utils/tests/application.test.ts` so the bands are labelled Cold / Neutral / Hot.
- [x] 3.2 Update `src/components/Settings/AdvancedSettingsPopup/tests/AdvancedSettingsPopup.test.tsx`: the tooltip and `aria-valuetext` expectations use the Cold key after moving down to `0.3`, and a case for Hot at `0.7`.

Verification: `npx vitest run src/utils/tests/application.test.ts src/components/Settings/AdvancedSettingsPopup/tests/AdvancedSettingsPopup.test.tsx`, then `npm run lint`, `npm run typecheck`, and the full `npm test` once.
