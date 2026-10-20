# Proposal

## Why

Ten specs describe a read-only editor that the app can never enter: `EditorClient` never passes `isReadonly` to `QuickApp2Form`, shared applications are deliberately editable (#208), and a read-only mode is not wanted. The scenarios and wording mislead QA and developers (QA test cases TC-17 to TC-20 on #210 were written against them) and the "Read-only mode is unreachable" tech-debt item was removed on that basis. See `fix-skills-spec-versionless`.

## What Changes

- Remove every "when the editor is read-only" scenario and wording from the affected specs. Controls that were "disabled in read-only" are simply always available.
- Rename the read-only-aware attachments requirement to "Attachments controls are accessible and direction-aware".
- Fix `docs/TECH_DEBT.md` ("a read-only form" in the ignored-saves item) and `docs/REACT_HOOK_FORM_REMOVAL_PLAN.md` (read-only save and input behaviour).
- OpenSpec cannot drop a scenario from a MODIFIED requirement, so each requirement that loses a scenario is REMOVED and re-ADDED under a title with an " (editable)" suffix. Requirements that only lose a sentence stay MODIFIED.
- Unrelated "read-only" uses stay: read-only file paths, the read-only wording of status messages, read-only favorites, the context-files read-only folder, and the catalog `ListView` `isReadonly` prop.
- **No source code changes.** The `isReadonly` props stay in the components; removing them is a follow-up.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-configuration` (quoted title only), `application_editor-layout`, `application_user-attachments`, `agents_selection`, `toolsets_selection`, `application_conversation-starters`, `application_knowledge-base`, `application_advanced-settings`, `orchestrator_model-selection`, `application_credentials`, `skills_catalog`: read-only editor behaviour removed.

## Impact

- Ten `openspec/specs/*/spec.md` files (via archive of this change) and two docs files.
- No source, API or dependency changes. Existing tests that exercise the `isReadonly` prop still pass but no longer have a spec scenario behind them.
