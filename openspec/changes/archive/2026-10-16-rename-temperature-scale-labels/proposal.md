## Why

QA on #209 (TC-4, TC-23) expects the Temperature bubble in the Advanced Settings popup to read **Cold / Neutral / Hot**. The mockups use those labels, and #209 says the mockups are the source of truth. Today the bubble shows ai-dial-chat's **Precise / Neutral / Creative** (`src/utils/application.ts:75-79`, `application_advanced-settings` "Temperature in the popup").

## What Changes

- The temperature bubble and the slider's `aria-valuetext` show "Cold" for `0`–`0.3`, "Neutral" for `0.4`–`0.6` and "Hot" for `0.7`–`1`. The bands and thresholds stay the same.
- New QuickApps-specific translation keys for "Cold" and "Hot" under `applicationEditor.advancedSettings`. "Neutral" keeps reusing `ChatSettingsI18nKeys.TemperatureNeutral`.
- The `ChatSettingsI18nKeys.TemperaturePrecise` / `TemperatureCreative` keys and their `en.json` entries are removed. The bubble was their only user (`src/utils/application.ts:76-77`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_advanced-settings`: "Temperature in the popup" changes the scale labels from Precise/Creative to Cold/Hot.

## Problem

The scale labels differ from the mockups and from what QA expects.

## Solution

Swap the label keys returned by `getTemperatureScaleLabelKey`. No layout, value or persistence changes.

## Non-goals

- Changing the band thresholds, slider range or step, or the value input.
- Changing ai-dial-chat's own labels. QuickApps diverges from chat here on purpose.

## Acceptance criteria

- With the temperature at `0`–`0.3`, `0.4`–`0.6` or `0.7`–`1`, the bubble and `aria-valuetext` show "Cold", "Neutral" or "Hot" respectively.
- `en.json` and `translation-keys.ts` contain no Precise or Creative entries.
- `npm test`, `npm run lint` and `npm run build` pass.

## Alternatives considered

Keep the `chatSettings.temperaturePrecise` / `temperatureCreative` key paths and change only their English values. Rejected: those key paths mirror ai-dial-chat, where they mean "Precise"/"Creative". Reusing a chat key path with different text breaks the key-alignment rule.

## Impact

- Code: `src/utils/application.ts`, `src/constants/translation-keys.ts`, `src/i18n/locales/en.json`, and the tests `src/utils/tests/application.test.ts` and `src/components/Settings/AdvancedSettingsPopup/tests/AdvancedSettingsPopup.test.tsx`.
- i18n: two new user-visible strings ("Cold", "Hot") and two removed ("Precise", "Creative").
- RTL: none. Labels are text in an existing bubble.
- No auth, host-integration or API-layer impact. Saved data is unchanged.
- Rollback: not breaking. Revert the commit.
