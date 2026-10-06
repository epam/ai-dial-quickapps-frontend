# Proposal

## Why

The Quick App editor currently exposes Skills and Agents & Toolsets as separate, independently collapsible areas, so the empty-state layout does not match the new Add-ons design and hides the primary add actions behind section state. The editor needs a single Add-ons grouping below Instructions, with concise rows that keep add actions discoverable while avoiding empty content panels until the user has selected something.

## What Changes

- Add an Add-ons section immediately below Instructions in the primary editor column.
- Move the existing Agent skills control into the first Add-ons row, labeled Skills; keep its existing form field (`agentSkills`), selector behavior, read-only behavior, and content-panel styling when items exist.
- Keep the Skills Add action visible by default, including when no skills are selected; render the existing skills content window only when at least one skill is selected.
- Keep Agents & Toolsets merged as one Add-ons row for now, with the existing picker and JSON behavior; keep its current content-panel styling when items exist and hide that content area when no agent or tool is selected.
- Leave the remaining editor sections and their order unchanged after Add-ons, including context files, feature controls, attachments, conversation starters, and advanced settings.
- Preserve existing form state ownership, save serialization, API usage, and responsive/RTL layout behavior.

## Capabilities

### New Capabilities

<!-- None. This is a layout and visibility refinement within the existing editor capability. -->

### Modified Capabilities

- `application_editor-layout`: Define the Add-ons grouping, its Skills and merged Agents & Toolsets rows, and conditional visibility of their content windows.

## Impact

- **UI code:** `src/components/QuickApp2Form.tsx`, the existing Agent Skills section, the existing Context & Tools section, and likely a small shared row/container component or selector visibility adjustment.
- **Form/state:** Reuses the existing React Hook Form fields `agentSkills` and `agentsAndToolsets`; no new context, state owner, or API request is required. The existing selectors remain responsible for modal selection and chip rendering.
- **Tests:** Extend the Quick App editor layout/section tests to cover Add-ons placement, always-visible Add actions, and hidden empty-state content panels; retain coverage for populated and read-only states.
- **i18n:** Add-ons and the shorter Skills/Tools/Agents labels may require new localized keys. Existing picker empty-state, tooltip, and selector strings should be reused where possible. All new user-visible strings must be added to the supported locale resources.
- **RTL:** Use logical spacing/alignment utilities for new layout; any directional add/expand affordances must follow the existing RTL rules. The change must not pin Add actions to the physical right in RTL.
- **Scope boundaries:** No changes to auth, host integration, chat-api wrappers, persistence format, or entity-fetching behavior.

## Problem

The current editor layout gives empty Skills and Agents & Toolsets areas a large, collapsible panel and does not present the Add-ons concept shown by the target design. Users should be able to discover and invoke Add immediately, while empty content windows should not consume space before any add-on exists.

## Solution

Introduce a presentation-level Add-ons container below Instructions. Render Skills and the merged Agents & Toolsets controls as rows within it, with their existing selectors unchanged for populated states. Make each row's add action independent of the content visibility, and gate only the existing content window on the corresponding selected-value array length. Continue to source values from the existing form and pass the existing read-only/tooltip props through; no new context is needed.

### Alternatives considered

- **Conservative baseline: only change default collapse state:** rejected because it would not create the requested Add-ons grouping or keep Add visible in the empty state.
- **Add a new context/store for add-ons visibility:** rejected because visibility is a pure derivation of existing `agentSkills` and `agentsAndToolsets` form values and would add synchronization risk.
- **Replace selectors with new add-on-specific controls:** rejected because it would duplicate modal, chip, JSON, read-only, and API-facing behavior already implemented by `SkillsSelector` and `AgentsAndToolsetsField`.

## Non-goals

- Splitting Agents and Toolsets into separate sections.
- Redesigning the populated Skills or Agents & Toolsets content windows.
- Moving or redesigning Context Files, attachments, feature toggles, Conversation Starters, Advanced Settings, or Configuration controls.
- Changing saved application properties, validation rules, entity catalogs, API calls, host messages, or modal behavior.
- Adding new add-on types such as Knowledge Base or Conversation Starters; those remain existing downstream sections for this change.

## Acceptance criteria

- Add-ons renders directly below the standalone Instructions section in the primary editor column.
- With no selected skills, the Skills row and its Add action are visible, while its existing content window is not rendered.
- With one or more selected skills, the Skills content window is rendered with the existing selector/chip styles and behavior; removing the last skill hides it again.
- With no selected agents or toolsets, the merged Agents & Toolsets row and its Add action are visible, while its existing content window is not rendered.
- With one or more selected agents or toolsets, the merged content window is rendered with the existing picker/JSON behavior; removing the last item hides it again.
- Existing downstream sections remain in their current order and preserve their conditional visibility and values.
- Read-only/shared applications keep controls disabled and do not expose selection modals through the Add actions.
- Save and auto-save serialize the same `agentSkills` and `agentsAndToolsets` values as before, with no additional chat-api request caused by the layout.
- The responsive editor remains free of horizontal overflow, and Add actions/spacing follow document direction in RTL locales.
- Relevant unit/component tests, type-check, lint, and build pass.

## Rollback / backward compatibility

This is not a persistence or API breaking change. Reverting the presentation changes restores the previous section arrangement without migration because the same form field names and serialized values remain in use. If the new localized labels are reverted, remove their unused locale keys together with the UI change.

## Investigation references

- `src/components/QuickApp2Form.tsx:279-346` owns the editor section order and existing form state wiring.
- `src/components/AgentSkills/AgentSkillsFormSection.tsx:26-43` wraps the existing `agentSkills` selector in a collapsible section.
- `src/components/ContextAndTools/ContextAndToolsSection.tsx:60-80` renders the existing merged Agents & Toolsets field and currently keeps other context controls in the same section.
- `src/components/common/SkillsSelector/SkillsSelector.tsx:55-85` already owns the Skills Add action, empty state, and populated chip panel.
- `src/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector.tsx:72-133` already owns the Agents & Toolsets Add action, empty state, and populated chip panel.
- `openspec/specs/application_editor-layout/spec.md` is the existing normative layout capability being modified.
