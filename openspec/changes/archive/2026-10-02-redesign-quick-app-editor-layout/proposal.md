
# Proposal

## Why

The Quick App editor currently presents the instruction editor, model controls, and other configuration controls in one vertical Orchestrator block. This makes the primary instruction surface compete with configuration controls and does not match the target editor composition, which separates instructions from a right-side Configuration area.

### Problem

Users need a clear primary editing surface for instructions while still being able to find model configuration and related settings without scrolling through one combined section.

### Solution

Introduce a responsive editor layout with a primary content column and a right-side Configuration column. Move the existing model, temperature, and process-files controls into Configuration, and leave the instructions editor as a standalone, always-visible section. Remove the now-empty Orchestrator wrapper. Reuse the current controls and styling rather than redesigning them.

## What Changes

- Add a responsive two-column composition for the Quick App editor on larger screens and a stacked composition on smaller screens.
- Add a right-side `Configuration` section in the editor layout.
- Move the existing model selector and temperature control from Orchestrator into Configuration without changing their form field names, behavior, validation, or visual treatment.
- Move the existing process-files control from the former Orchestrator block into Configuration; preserve its current visibility and behavior.
- Render the existing instructions editor in a standalone, always-visible Instructions section; remove the empty Orchestrator wrapper.
- Preserve existing i18n strings and form persistence/API serialization; this change is presentation-only.
- Use direction-aware layout utilities and preserve accessible semantics for the remaining form sections in RTL locales.

## Capabilities

### New Capabilities

- `application_editor-layout`: Defines the observable Quick App editor composition, including the responsive primary-content/Configuration columns and the standalone always-visible Instructions section.

### Modified Capabilities

- None. No existing capability specification currently defines Quick App editor layout requirements.

## Impact

### Affected code

- `src/components/QuickApp2Form.tsx` — compose the responsive columns and place sections.
- `src/components/Orchestrator/OrchestratorSection.tsx` — replace the former collapsible wrapper with the standalone instructions presentation, or remove it if the presentation is composed directly at the form boundary.
- `src/components/Orchestrator/ModelConfigurationSection.tsx` (new) — own the moved model, temperature, and process-files presentation while continuing to use the parent form control.
- Potentially `src/components/common/FormCollapsibleSection.tsx` — only if the existing shared section wrapper needs a layout-neutral adjustment; no visual restyling is intended.
- Focused component tests for the new composition and always-visible Instructions behavior.

### State, API, and dependencies

- React Hook Form state remains owned by `QuickApp2Form`; no new context or hook is needed.
- No chat-api endpoint, request/response shape, persistence format, or dependency changes are required.
- Existing `model`, `temperature`, `processLargeFiles`, and `instructions` fields remain the source of truth.

### i18n and RTL

- No new user-visible strings are required; Configuration, Instructions, and existing field text must use the current marketplace translations.
- The new layout must use logical direction-aware spacing/alignment utilities and stack correctly in RTL.

### Alternatives considered

- **Keep the single vertical form and only reorder sections:** lowest delivery cost, but cannot provide the requested right-side Configuration area or the target information hierarchy.
- **Build a new independent configuration state/model:** rejected because it duplicates existing React Hook Form state and risks changing save behavior. Reusing the existing controlled fields is safer and reversible.
- **Redesign the controls while moving them:** rejected for this increment; it expands scope beyond the explicit request to move blocks while preserving their appearance.

### Acceptance criteria

- On larger viewports, the instruction/content column and Configuration column render side by side; on smaller viewports they render in a usable stacked order.
- Configuration visibly contains the existing model selector, temperature control when applicable, and process-files control when applicable.
- Orchestrator is no longer an empty or collapsible wrapper; the Instructions section is always visible and contains the existing editor.
- Existing form values, validation, dirty-state tracking, save serialization, read-only behavior, and conditional visibility remain unchanged.
- No new API calls or user-visible strings are introduced.
- The layout remains usable in RTL locales and existing section controls expose correct accessibility state.

## Rollback / Backward Compatibility

This is a presentation-only, backward-compatible change. Reverting the layout composition and section split restores the current single-column arrangement; saved application data and host integration messages are unaffected.
