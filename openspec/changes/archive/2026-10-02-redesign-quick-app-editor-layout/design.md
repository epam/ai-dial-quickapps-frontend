# Design

## Context

See `proposal.md` for the motivation and observable scope. The current editor is a single React Hook Form surface in `src/components/QuickApp2Form.tsx:278-341`. `OrchestratorSection` currently owns the presentation of model, temperature, instructions, and process-files controls in `src/components/Orchestrator/OrchestratorSection.tsx:44-119`, while `FormCollapsibleSection` already provides the shared collapsible behavior and `aria-expanded` state in `src/components/common/FormCollapsibleSection.tsx:15-45`.

The form control remains the state owner. Existing `model`, `temperature`, `instructions`, and `processLargeFiles` fields are read and written through the same `Control` and `Controller` instances. No new API surface is needed; the existing form builder and save path continue to serialize the unchanged data shape.

## Goals / Non-Goals

**Goals:**

- Compose the editor into a responsive primary-content column and right-side Configuration column.
- Extract the existing model, temperature, and process-files presentation into a focused Configuration component.
- Leave the instructions editor as a standalone, always-visible Instructions section; remove the now-empty Orchestrator wrapper.
- Preserve current control markup, field bindings, conditional visibility, tooltips, read-only handling, and i18n keys wherever possible.
- Keep the layout direction-aware for Arabic and other RTL locales.
- Make the composition and Instructions visibility testable through accessible roles and text.

**Non-Goals:**

- No changes to the Quick App schema, `applicationProperties` serialization, API client, host messages, or save lifecycle.
- No new context, hook, or state store; `QuickApp2Form` remains the React Hook Form state owner.
- No visual redesign of the moved controls, new icons, new copy, or broader settings redesign.
- No changes to unrelated sections such as Context and Tools, Skills, Attachments, Conversation Starters, or Advanced Settings beyond placing them in the primary content column as needed for the target composition.

## Decisions

### 1. Split presentation by responsibility, not by state

Create a standalone Instructions presentation for the existing instructions Controller and markdown editor. Remove the former Orchestrator collapsible wrapper rather than rendering an empty heading. Keep `ModelConfigurationSection` responsible for the model, temperature, and process-files controls.

**Why:** This preserves one form state owner and avoids duplicated Controllers or synchronization effects. A separate component also gives the right-side area a stable boundary for focused tests.

**Alternative rejected:** Add a second form or local state for Configuration. That would create two sources of truth and could cause save/dirty-state divergence.

### 2. Compose the layout at the existing form boundary

Update the return structure in `QuickApp2Form.tsx` to wrap the existing sections in a responsive Tailwind grid. Place the primary content sections in one column and the new Configuration section in the second column. Use the repository's configured desktop breakpoint and direction-neutral grid utilities; avoid fixed pixel widths and physical left/right spacing for directional layout.

**Why:** The parent already owns all section props, watched values, and callbacks, so it is the narrowest place to establish placement without changing domain code.

**Alternative rejected:** Add positioning logic inside individual sections. That would couple reusable sections to page layout and make narrow-screen stacking harder to reason about.

### 3. Keep Instructions always visible

Reuse the existing instructions field markup in an always-visible section at the form boundary. Do not add a second form or local state; the parent continues to own the RHF control.

**Why:** Instructions are the primary editing surface and should not require an extra interaction before they can be edited.

**Alternative rejected:** Keep a collapsible Orchestrator wrapper. That hides the primary editing surface and leaves an unnecessary section boundary after the configuration controls have moved.

### 4. Use existing translations only

Use the existing marketplace translation key for the Configuration heading if it is already present. If no suitable key exists, add one through the normal locale workflow rather than hardcoding text; the task breakdown must verify all supported locale files. Existing field labels and descriptions remain unchanged.

**Why:** The request is a placement change and should not introduce untranslated UI.

### 5. Preserve direction-aware layout and indicator behavior

Use grid/flex classes that naturally follow `dir`, logical spacing utilities (`ms`/`me`, `ps`/`pe`, `start`/`end`) for any new directional spacing, and mirror a chevron only if it conveys directional movement. The previous collapsible semantics no longer apply to Instructions; the standalone section is always rendered and exposes no `aria-expanded` control. Configuration remains a separate section with the existing controls.

**Why:** The editor must behave consistently in RTL without changing the form contract or adding locale-specific branching.

## Risks / Trade-offs

- **[Risk] Existing sections have legacy physical spacing classes.** → Keep this change focused on the new composition and update only touched layout classes to logical equivalents; record broader legacy RTL cleanup as follow-up rather than expanding scope.
- **[Risk] The Configuration column may become cramped at intermediate iframe widths.** → Use a responsive breakpoint and flexible grid columns with a stacked fallback; avoid fixed widths and verify at narrow, desktop, and wide viewport sizes.
- **[Risk] Moving Controllers can accidentally change dirty-state or validation behavior.** → Reuse the same RHF `control`, field names, error objects, and callbacks; add tests that edit moved controls and verify accessible placement plus unchanged form binding.
- **[Risk] The Configuration heading may lack a complete translation set.** → Inspect the marketplace locale keys before implementation; add only the missing key(s) across every supported locale if required.

## Migration Plan

1. Implement the new section boundary and parent grid while keeping existing form field names and save code unchanged.
2. Run focused component tests, typecheck, lint, and the full test suite.
3. Verify the editor at narrow and desktop widths and in an RTL locale through the normal app run workflow.
4. Roll back by restoring the original single-column composition and moving the existing JSX back into `OrchestratorSection`; no data migration or API rollback is required.
