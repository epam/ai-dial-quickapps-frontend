# Proposal

## Why

The Quick App editor's right-side Configuration area currently exposes model-related controls but has no visible entry point for the settings that users expect from the target layout. We need the Settings row and Advanced popup shell now so the layout can match the design while leaving the existing left-column Advanced settings controls untouched until a later change moves them.

## What Changes

- Add a translated **Settings** row to the right-side Configuration area.
- Place a right-aligned, UI-kit **Advanced** action in that row, with a settings affordance matching the target layout.
- Open an accessible, empty **Advanced Settings** popup when the action is activated.
- Match the Configuration row, popup header/body/footer, spacing, surface, and typography to the supplied screens and the existing UI-kit theme; the popup body remains intentionally empty.
- Keep the existing `AdvancedSettingsSection` and its form controls unchanged.
- Keep the popup state local to the configuration UI; do not add form fields, persistence, API calls, or a new context. Until content is moved into the popup, its Close and Save shell actions only close the popup and do not change application data.
- Add the required `quickAppEditor` translation keys and accessible labels.
- Add focused tests for the row, popup open/close behavior, empty body, read-only presentation, and responsive/direction-aware markup where the existing test setup supports it.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `application_editor-layout`: extend the Configuration area contract with a Settings row and an empty Advanced Settings popup while preserving the existing model controls and legacy Advanced settings section.

## Impact

- **UI:** `ModelConfigurationSection` and a small popup/section component under `src/components/`; no change to the primary-column form sections.
- **Translations:** `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` gain user-visible Settings/Advanced/popup action keys. The current app has only an English resource, so no other locale file is currently required.
- **Tests:** configuration-section tests and, if useful for isolation, a dedicated popup/section test.
- **Dependencies:** reuse the installed `@epam/ai-dial-ui-kit` popup and button components and existing Tabler settings icon; no dependency or API changes.
- **State and persistence:** local open state only; no React context, React Hook Form field, chat-api request, host message, or saved application-property change.
- **RTL:** new placement and spacing will use logical alignment utilities; the symmetric settings icon will not be mirrored. The popup's built-in direction-aware behavior will be retained.
- **Scope boundary:** this does not touch auth, host integration, the chat-api client, or the old `src/components/AdvancedSettings/AdvancedSettingsSection.tsx` controls.

## Alternatives Considered

- **Reuse the legacy Advanced settings section:** rejected because it lives in the primary column and the request explicitly keeps it unchanged; it would also couple the new right-column shell to existing form controls prematurely.
- **Use a native `<dialog>` and custom buttons:** rejected because the existing UI-kit popup provides the project's established focus, portal, scrim, close, and theming behavior with less duplicated accessibility code.
- **Add a global settings context:** rejected because the first increment has no durable settings state; local popup visibility is sufficient and avoids introducing synchronization or persistence concerns.

## Acceptance Criteria

- At desktop widths, Configuration retains its existing model controls and shows a Settings row with Advanced aligned to the row's trailing edge.
- Activating Advanced opens a titled, empty Advanced Settings popup; closing via the header, Close, Save, outside click, or the UI-kit keyboard behavior leaves the form and saved values unchanged.
- The old Advanced settings section still renders and behaves exactly as before.
- The new UI has translated visible text and accessible names, does not introduce hardcoded directional positioning, and remains usable in RTL and narrow layouts without horizontal overflow.
- Existing configuration tests and the new focused tests pass, and the implementation passes type-check, lint, and build.

## Rollback / Compatibility

This is additive and non-breaking. Reverting the new configuration row, popup component, translation keys, and tests restores the prior behavior; no data migration or backend rollback is required because no persisted state is introduced.
