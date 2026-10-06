# Design

## Context

The existing editor order and form wiring live in `src/components/QuickApp2Form.tsx`. `AgentSkillsFormSection` uses `FormCollapsibleSection`, while `ContextAndToolsSection` renders the merged `AgentsAndToolsetsField` together with context files and feature controls. The two selectors already own their Add buttons, modal lifecycle, chip rendering, JSON mode, and read-only behavior. Their populated content-panel classes are the styles that must remain unchanged. See `proposal.md` for motivation and `specs/application_editor-layout/spec.md` for the observable contract.

## Goals / Non-Goals

**Goals:**

- Add a primary-column Add-ons card below Instructions without changing the existing form field names or save path.
- Present Skills and the still-merged Agents & Toolsets control as labeled rows with Add actions available in the empty state.
- Remove only the empty-state content panels; preserve existing selector markup and styles when values are present.
- Keep the remaining Context & Tools settings, attachments, conversation starters, and advanced settings in the same downstream order.
- Keep the implementation direction-aware and accessible in all supported locales.

**Non-Goals:**

- No new context, API client method, endpoint, persistence field, or entity-fetching flow.
- No split between Agents and Toolsets, and no redesign of their picker/modal/chips.
- No redesign of the populated Skills or Agents & Toolsets panels.
- No changes to model Configuration or the standalone Instructions editor.

## Decisions

### 1. Reuse existing form state; derive visibility from selection arrays

`AddOnsSection` will receive the existing React Hook Form `control` and the watched `agentsAndToolsets` values from `QuickApp2Form`. Skills visibility is derived from the controlled `agentSkills` value; Agents & Toolsets visibility is derived from `agentsAndToolsets`. No local `isOpen`/`hasItems` state or new context is introduced, so removing the last item immediately removes the corresponding panel and cannot drift from saved form state.

**Alternative rejected:** storing visibility in a new context or local toggle would introduce synchronization and reset behavior not present in the source-of-truth form.

### 2. Add an Add-ons composition component and retain selector ownership

Create a form-specific `src/components/AddOns/AddOnsSection.tsx` that owns the card/row composition and translations. It will render the existing Skills and Agents & Toolsets field components inside labeled rows and pass through `isReadonly` and the shared tooltip. The existing selector components remain responsible for their Add buttons, modal opening, chip actions, JSON toggle, and read-only enforcement.

`AgentSkillsFormSection` will become the Skills row implementation (or be reduced to a row wrapper) rather than owning a collapsible section. `ContextAndToolsSection` will keep its current outer section and all non-agent/tool children; the Agents & Toolsets row will be composed in Add-ons using the same existing field and callbacks.

**Alternative rejected:** rebuilding both selectors inside Add-ons would duplicate modal and chip behavior and risk changing entity selection or JSON semantics.

### 3. Gate only selector content, not the selector/Add action

Update `SkillsSelector` and `AgentAndToolsetSelector` so their Add-action wrapper is always mounted, while the current `DialNoDataContent` empty panel is not rendered for an empty value. The populated chip-panel branches, including their current class names, remain unchanged. This keeps Add actions discoverable and ensures the empty content window does not consume space.

Because the selector remains mounted inside its row, read-only behavior and tooltip handling continue to apply to the Add action. The existing selection modals remain guarded by `!readonly`.

**Alternative rejected:** conditionally mounting the entire selector based on item count would hide the Add action precisely when it is needed.

### 4. Keep merged Agents & Toolsets behavior and callbacks intact

Move the existing `AgentsAndToolsetsField` presentation into Add-ons without changing `onAgentsChange`, JSON view conversion, item configuration, or login modal paths. `QuickApp2Form` continues to own the callbacks and `setValue` calls. `ContextAndToolsSection` loses only the moved field's rendering and now retains context files and feature controls in its current sequence.

No chat-api call is introduced. Existing catalog requests remain in `DataContext`/`dialClient`; the layout only consumes already available maps and form values.

### 5. Localize labels and use logical direction-aware layout

Add the `quickAppEditor` keys `AddOns` and `Skills` if they are not already present, and reuse the existing `AgentsAndToolsets` key for the merged row. Add corresponding values to every supported locale resource. Selector tooltips, Add labels, and empty-state messages continue using their existing `common` and `quickAppEditor` keys.

The Add-ons wrapper will use semantic section markup and logical spacing/alignment utilities (`ms`/`me`, `text-start`/`text-end`, and logical inset utilities as needed). The plus icon is symmetric and remains unmirrored. No new expand/collapse control is needed, so the hidden empty state cannot expose stale `aria-expanded` semantics.

### 6. Preserve memoisation boundaries

Keep `React.memo` on section components that are already memoized. `AddOnsSection` should be memoized once its props are defined, and callbacks created in `QuickApp2Form` should continue using `useCallback`. Visibility is a direct boolean derivation, not a memoized state object; no new effect is needed.

### 7. Match the target Add-ons typography and rhythm

Keep the Add-ons card as a separate rounded surface with a small top margin after Instructions. Use the existing typography utilities for the section heading, row titles, and secondary descriptions rather than relying on `DialFormItem` defaults, whose label treatment is smaller and muted. Apply a generous, consistent vertical gap between rows and preserve the selector content panel styles when a selection exists. The Add action remains owned by each selector, with its placement aligned to the row title.

**Alternative rejected:** adding arbitrary per-row margins would make spacing depend on content-window state and would be harder to keep consistent across RTL and populated states.

## Risks / Trade-offs

- **[Risk] Moving `AgentsAndToolsetsField` changes the DOM nesting used by its absolute Add button.** → Keep the selector mounted inside a positioned row and verify the Add button and populated panel at desktop, narrow, and RTL widths; do not alter the existing populated panel classes.
- **[Risk] Removing the empty `DialNoDataContent` changes snapshot or layout assumptions in selector tests.** → Add focused empty/populated selector assertions and update only expectations that describe the intentionally removed empty panel.
- **[Risk] Existing context section spacing changes when its first child moves.** → Keep `ContextAndToolsSection`'s outer `FormCollapsibleSection` and all remaining `DialFormItem` children unchanged; visually check section order and separators in `QuickApp2Form`.
- **[Risk] New labels are missing from one locale.** → Update all `src/i18n/locales/*.json` files used by the `quickAppEditor` namespace and run the existing i18n/type/build checks.
- **[Risk] RTL regression from physical positioning.** → Replace new directional positioning with logical utilities and manually verify `dir="rtl"`; retain only existing physical styles where selector internals are intentionally unchanged.

## Migration Plan

1. Add/adjust translation keys and create the Add-ons composition/row wiring.
2. Move the merged Agents & Toolsets presentation into Add-ons, leaving its form callbacks and selector internals intact.
3. Remove only the empty-state panel branches from both selectors and add unit/layout coverage for empty, populated, last-item-removed, read-only, and RTL-relevant markup.
4. Run `npm test`, `npm run lint`, and `npm run build`; manually verify the editor at desktop and narrow widths.
5. Roll back by restoring the previous section composition and empty-state branches. No data migration or backend rollback is required because `agentSkills` and `agentsAndToolsets` remain unchanged.

## Open Questions

None that change the approved behavior or implementation approach. The Agents and Toolsets row remains merged as explicitly requested; splitting it is deferred to a future change.
