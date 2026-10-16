## MODIFIED Requirements

### Requirement: Temperature in the popup

The Advanced Settings popup SHALL show the orchestrator temperature as the first body control, using the kit 2.0 `Slider`, only when the selected model supports temperature. The slider SHALL edit the draft `temperature` value, which is seeded from the form field `temperature` (`useQuickApp2Form`, default `0.5` via `DEFAULT_TEMPERATURE`, loaded from `application_properties.orchestrator.deployment.parameters.temperature`). The visibility check SHALL be the existing `doesModelAllowTemperature` against `DataContext`'s `modelsMap`, memoised with `useMemo` as today. No other memoisation is required.

#### Scenario: Slider presentation

- **WHEN** the popup opens for a model with `features.temperature: true` and form `temperature` `0.5`
- **THEN** the slider SHALL be labelled above the track with `ChatSettingsI18nKeys.TemperatureLabel` ("Temperature")
- **AND** it SHALL range from `0` to `1` in steps of `0.1`
- **AND** tick marks SHALL be derived from that step: exactly 10, one per `0.1` step after `0` (0.1 … 1.0), with no finer grid such as the `0.05` spacing drawn in the mockup frame. Tick count and colour (`Controls/Stroke/Accent-focus`, `--stroke-accent-focus`) come from the ui-kit `Slider`; the app does not restyle them
- **AND** a bubble above the thumb SHALL show the scale label for the current value: `ApplicationEditorI18nKeys.AdvancedSettingsTemperatureCold` (`applicationEditor.advancedSettings.temperatureCold`, "Cold") for `0`–`0.3`, `ChatSettingsI18nKeys.TemperatureNeutral` ("Neutral") for `0.4`–`0.6`, `ApplicationEditorI18nKeys.AdvancedSettingsTemperatureHot` (`applicationEditor.advancedSettings.temperatureHot`, "Hot") for `0.7`–`1`. These follow the mockups and intentionally differ from ai-dial-chat's "Precise" / "Creative"
- **AND** a compact number input named `ApplicationEditorI18nKeys.AdvancedSettingsTemperatureValue` ("Temperature value") SHALL show the value with one decimal (`0.5`) on the logical end side of the track
- **AND** neither a temperature description nor scale labels below the track SHALL be rendered

#### Scenario: Changing the draft temperature

- **WHEN** the user moves the slider to `0.3`
- **THEN** the bubble SHALL show "Cold" and the value input `0.3`
- **AND** the form `temperature` value SHALL stay unchanged until Save

#### Scenario: Upper band

- **WHEN** the user moves the slider to `0.7`
- **THEN** the bubble and the slider's `aria-valuetext` SHALL show "Hot"

#### Scenario: Model without temperature support

- **WHEN** the selected model is loaded and its `features.temperature` is not `true`
- **THEN** the popup SHALL NOT render the Temperature slider
- **AND** on save `orchestrator.deployment.parameters` SHALL be omitted, so no temperature is sent

#### Scenario: Selected model not loaded yet

- **WHEN** the selected model id is not in the loaded models
- **THEN** the popup SHALL render the Temperature slider

#### Scenario: Temperature accessibility

- **WHEN** a keyboard or assistive-technology user reaches the slider
- **THEN** it SHALL expose a slider role named by `ChatSettingsI18nKeys.TemperatureLabel`, with `aria-valuenow` equal to the numeric value and `aria-valuetext` equal to the current scale label
- **AND** arrow keys SHALL change the value by one step
- **AND** the value input SHALL be the next focus stop after the slider

#### Scenario: Typing a temperature

- **WHEN** the user types `0.36` into the value input
- **THEN** the draft temperature SHALL become `0.4` (clamped to `0`–`1` and snapped to the `0.1` step) and the slider and bubble SHALL follow
- **AND** the input SHALL keep showing the typed text until it loses focus, then show `0.4`
- **AND** an empty input SHALL leave the draft temperature unchanged
- **AND** the form `temperature` value SHALL stay unchanged until Save
