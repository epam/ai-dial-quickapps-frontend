# Design

## Context

The existing Configuration column is rendered by `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx:42-107`; it owns the model, temperature, and process-files controls and already receives the editor's `isReadonly` flag. The legacy `src/components/AdvancedSettings/AdvancedSettingsSection.tsx` remains in the primary form column and must not be changed. Existing popup usage is concentrated in components such as `src/components/ContextAndTools/DialAppConfigurationModal.tsx:57-111`, while the installed `@epam/ai-dial-ui-kit@0.14.0` exports both legacy and current-generation popup/button components. See `proposal.md` and the delta spec for the motivation and observable contract.

## Goals / Non-Goals

**Goals:**

- Add a self-contained Settings row below the existing Configuration controls without changing their order, values, or conditional rendering.
- Provide a direction-aware UI-kit Advanced trigger and an empty, screenshot-shaped popup shell with header, blank body, and Close/Save footer actions.
- Keep popup visibility transient and local, preserve read-only behavior, and keep the old Advanced settings form untouched.
- Cover the new observable states with focused unit tests and verify the rendered result at desktop, narrow, and RTL directions.

**Non-Goals:**

- No settings controls, React Hook Form fields, serialization, dirty-state changes, or backend/API work in this increment.
- No migration of controls out of `AdvancedSettingsSection` and no redesign of model selection, temperature, or process-files controls.
- No new context, custom modal primitive, global store, or dependency.

## Decisions

### 1. Add a dedicated Settings composition component

Create a PascalCase component boundary under `src/components/Settings/`: `SettingsSection.tsx` owns the local `isPopupOpen` state and renders the row, while `AdvancedSettingsPopup.tsx` remains a presentational popup shell receiving `open` and `onClose` props. `ModelConfigurationSection` renders `SettingsSection` after the existing controls and passes `isReadonly`.

This keeps the configuration component focused on composing controls, makes the popup independently testable, and avoids placing a second unrelated modal in the legacy Advanced settings file. `SettingsSection` and the popup stay `React.memo`-compatible; `handleOpen`, `handleClose`, and `handleSave` use stable callbacks where they cross the component boundary.

**Alternative rejected:** putting popup state in `QuickApp2Form` or a context would broaden state ownership for a transient UI-only concern and introduce unnecessary rerenders.

### 2. Use current UI-kit 2.0 popup and button primitives

Use the package's current `Popup`, `Button`, and button enums, confirmed through the UI-kit MCP and the installed root exports. Configure `Popup` with `PopupSize.Sm`, a string translated header, `headerDivider`, `footerDivider`, and a translated `closeAriaLabel` so the dialog receives an accessible name and the close control is localized. Use built-in `additionalButtons`/`mainButtons` rather than hand-built footer buttons: Close is a secondary shell action that calls the same close callback, and Save is a primary/outlined shell action that also only closes while the body is empty.

Use the current `Button` primitive for the Advanced trigger with a settings icon from `@tabler/icons-react`, a small size, and the themed outlined/link treatment that best matches the supplied screenshot. Native `<button>` and `<dialog>` elements are not needed. If the current-generation wrapper's final visual tokens do not match the existing application theme in the browser, fall back only to the already-used legacy `DialLinkButton`/`DialPopup` pair without changing observable behavior; do not introduce custom modal behavior.

### 3. Keep row layout logical and screenshot-aligned

Render a semantic labelled section/row with the Settings heading and a trailing action in a `justify-between` layout. Use `text-start` and logical margin/padding utilities for any directional spacing; do not use physical `left`/`right`, `ml`/`mr`, or directional borders. The settings glyph is symmetric and remains unmirrored. Give the popup body a responsive minimum height capped by the available viewport so the empty shell retains the supplied popup's visual rhythm without creating narrow-screen horizontal overflow. Reuse existing `text-primary`, `text-secondary`, `bg-layer-*`, border, and typography tokens rather than inventing colors.

### 4. Localize all visible and accessible strings

Extend `QuickAppEditorI18nKeys` and `src/i18n/locales/quick-app-editor.json` with `Settings`, `Advanced`, `Close`, `Save`, and `CloseAdvancedSettings`. Reuse the existing `AdvancedSettings` key for the popup header so the old section's displayed text is not altered. Every visible label and explicit aria label is obtained through `useTranslation(Translation.QuickAppEditor)`; no English strings are embedded in the new components. The app currently registers only the English quick-app-editor resource, so no additional locale file is needed in this change.

### 5. Preserve existing data and read-only contracts

The new row receives `isReadonly` from `ModelConfigurationSection`. It disables the Advanced trigger in the same situations as the existing Configuration controls; no popup can be opened from a disabled trigger. Popup callbacks only set local visibility to false and never call `onSave`, `setValue`, a host message, or a chat-api helper. The legacy `AdvancedSettingsSection` import and render path in `QuickApp2Form` remain unchanged.

There is no endpoint, request payload, response shape, or migration because this shell has no external data contract. Existing `ModelConfigurationSection` memoisation remains; the new components are memoized and do not require `useMemo` for static labels or body content.

### 6. Test behavior at the component boundary

Add a focused `SettingsSection` test following the repository's manual `createRoot`/`act` Vitest style. Mock UI-kit `Button` and `Popup` with accessible test doubles that preserve `disabled`, click handlers, dialog role, and footer actions. Assert the translated Settings/Advanced labels, disabled read-only trigger, popup opening, empty body, and that Close/Save both hide the popup. Extend `ModelConfigurationSection.test.tsx` with a lightweight SettingsSection mock to assert the new row is composed without disturbing the existing control-count and temperature-visibility coverage. Run the existing QuickApp layout tests to ensure the legacy Advanced section remains in the primary column.

## Risks / Trade-offs

- **[Risk] Current-generation UI-kit tokens differ from the legacy controls surrounding the row.** → Prefer the installed current-generation exports and inspect the rendered result; use existing theme tokens and the documented legacy fallback only if the package's current component cannot reproduce the target surface.
- **[Risk] Popup content is empty but collapses to a much smaller surface than the supplied design.** → Give the body a responsive, viewport-capped minimum height while leaving it control-free; verify at desktop and narrow widths.
- **[Risk] Portal rendering makes unit assertions brittle.** → Mock the popup at the SettingsSection boundary for interaction tests and retain one browser/manual check for the real portal, scrim, focus, and direction behavior.
- **[Risk] A future control migration accidentally changes the old form contract.** → Keep this change's popup props and callbacks presentation-only, do not touch form schemas or `AdvancedSettingsSection`, and add a no-persistence assertion.
- **[Risk] RTL alignment regresses through a new physical utility.** → Review new classes against `.claude/rules/rtl.md`, test with `document.dir = 'rtl'`, and keep the icon unmirrored.

## Migration Plan

1. Add translation constants/resources and the two Settings components.
2. Compose the Settings row into `ModelConfigurationSection` without changing existing control branches.
3. Add/update focused tests and verify the real UI at desktop, narrow, and RTL sizes.
4. Run `npm test`, `npm run lint`, and `npm run build`.
5. Roll back by removing the Settings composition, popup, translations, and tests; no persisted data or backend rollback is required.

## Open Questions

None. The empty popup intentionally includes the screenshot's Close/Save shell actions; both close without saving until a later change supplies controls and persistence semantics.
