# React Hook Form Removal Plan

**Status:** Planning only. No production code has been changed.

**OpenSpec change:** [`openspec/changes/remove-react-hook-form/`](../openspec/changes/remove-react-hook-form/)

## Objective

Remove `react-hook-form` and `@hookform/resolvers` without changing the Quick App editor's observable behavior. The existing Zod schema and application serialization should remain the source of truth.

This is an internal form-engine replacement, not a UI redesign. The migration must preserve validation, dirty state, autosave, host-triggered save, reset, asynchronous model resolution, controlled inputs, and array/editing behavior.

## Current usage inventory

### Dependencies

- `package.json:25` — `@hookform/resolvers`.
- `package.json:39` — `react-hook-form`.
- `package.json:42` — `zod`, which should remain after RHF removal.
- `package-lock.json` contains both packages and the resolver's RHF peer dependency.

### Form owner

`src/components/QuickApp2Form.tsx` is the only form owner. It currently uses:

- `zodResolver(QuickApp2Schema)`.
- `useForm` with `defaultValues` and `mode: 'onChange'`.
- `control` passed to child sections.
- `watch` and `useWatch` for conditional UI and derived state.
- `setValue` for user and programmatic updates.
- `getValues` for JSON/simple toolset transitions.
- `setError`/`clearErrors` for MIME tag validation.
- `handleSubmit` for native and host-triggered saves.
- `formState.errors` for field/section errors.
- `formState.isDirty` for host dirty notifications and autosave gating.

Important behavior in this file:

- `:98-152` updates model lists, resolves asynchronous defaults, clears feature-disabled values, reports model readiness, and forwards dirty state.
- `:163-178` handles `DIAL_EDITOR_TRIGGER_SAVE_EVENT`, read-only state, autosave dirty gating, and invalid-submit suppression.
- `:180-243` derives conditional UI state and updates agents/toolsets while preserving existing metadata.
- `:249-266` validates MIME tags and remounts the tag input after an invalid optimistic edit.
- `:279-282` handles ordinary form submission.

### RHF-controlled sections

The following components import RHF types/components and contain active `Controller` instances:

- `src/components/AdvancedSettings/AdvancedSettingsSection.tsx` — `timestamp`.
- `src/components/AgentSkills/AgentSkillsFormSection.tsx` — `agentSkills`.
- `src/components/ContextAndTools/ContextAndToolsSection.tsx` — document files, code interpreter, file tools, add attachment, and web fetch; also consumes JSON errors.
- `src/components/ConversationStarters/ConversationStartersSection.tsx` — starters, intro text, auto-submit, and chat-input-disabled state; forwards container blur.
- `src/components/InstructionsSection/InstructionsSection.tsx` — instructions rich-text editor.
- `src/components/UserAttachments/UserAttachmentsSection.tsx` — attachment MIME types and maximum attachment count.
- `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx` — model, temperature, and process-large-files state.

There are approximately 17 active `Controller` instances. The sections are already mostly controlled components, so they can be migrated to typed `value`/`onChange`/`onBlur`/`error` adapters.

### RHF-only helper

- `src/components/common/Forms/ControlledFormField.tsx` imports the generic RHF controller surface and exports `withController`.
- Repository search found no call sites for `withController`; it can be deleted once the migration confirms it remains unused.

### Tests using RHF

- `src/components/InstructionsSection/tests/InstructionsSection.test.tsx` creates `useForm` only to provide `control`.
- `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx` does the same.
- `src/components/tests/QuickApp2Form.test.tsx` renders the real form owner and will need updates when its state/controller contract changes, although it does not directly import RHF today.

### RHF-independent code to preserve

`src/form/quickApp2Form.ts` should remain unchanged in responsibility:

- `QuickApp2Schema` and `AgentOrToolsetSchema`.
- `getQuickApp2FormData` and default model resolution.
- `getAgentsAndToolsetsFormValue`.
- `buildQuickApp2Config`.
- `getQuickApp2Toolsets`.

These functions cover domain validation, defaults, toolset conversion, starters, skills, attachments, model configuration, and application serialization. RHF removal should not change their contracts.

`EditorClient` should also retain its host/API contracts. Its dirty, save, autosave, reset, and serialization behavior is a regression target, not a redesign target.

## Cases that require regression coverage

### Validation and errors

- Valid form submission produces the same `onSave` payload.
- Invalid submissions do not call `onSave`.
- JSON view accepts only valid JSON arrays.
- JSON validation is conditional on JSON view being active.
- Unavailable models produce the same model error.
- Models without tool support produce the same model error.
- Empty `maxInputAttachments` remains a valid intermediate value.
- Invalid attachment counts retain current coercion/error behavior.
- Zod issue paths map to the same fields/sections.
- Existing translated validation messages remain unchanged.

### Dirty state and host events

- First user edit changes dirty state.
- Reverting to the initial value clears dirty state.
- Nested array edits affect dirty state correctly.
- Programmatic model-list and feature-flag updates preserve intended dirty semantics.
- Clean autosave is skipped unless `ignoreDirty` is set.
- Dirty autosave invokes save.
- Native submit and `DIAL_EDITOR_TRIGGER_SAVE_EVENT` both validate before saving.
- Read-only forms do not save.
- Host reset restores values, errors, generated starter baseline, and dirty state.
- Dirty notifications sent through `EditorClient` remain unchanged.

### Async and feature-driven behavior

- Saved model remains preferred when available.
- Default model is selected when appropriate.
- Tool-capable fallback model is selected when needed.
- `onModelReady` fires at the same point after model data is ready.
- Code interpreter, web fetch, and add-attachment values are cleared when their flags are disabled.
- Model capability data continues to control process-large-files availability.

### Controlled inputs

Verify two-way value propagation and read-only behavior for:

- Markdown instructions editor.
- Model selector.
- Temperature input/slider.
- Toggle and radio controls.
- Skills selector.
- Files selector.
- MIME tag input.
- Monaco JSON editor.
- Starter inputs.
- Agents/toolsets selector.

Preserve the special starter-container blur behavior.

### Arrays and semantic transitions

- Starters append a blank row when the current last row becomes non-empty.
- Starter removal keeps the trailing blank-row invariant.
- Starter IDs remain stable and are not replaced with array indexes.
- Agents/toolsets preserve `[schema]:*` metadata.
- Simple view to JSON view produces the same toolset JSON.
- JSON view to simple view reconstructs the same selections and code-interpreter state.
- Discarding JSON returns to the same simple representation.
- Context files are decoded, deduplicated, added, and removed identically.
- Invalid MIME tags set an error and resynchronize the optimistic tag input with the last valid value.

### Verification commands

Run after each vertical slice as appropriate, and all commands after dependency removal:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

Also verify repository-wide that there are no remaining imports from:

```text
react-hook-form
@hookform/resolvers
```

If the live chat-api/host embedding environment is available, verify save, dirty, autosave, and reset flows in the embedded browser. If it is not available, record that limitation and rely on the automated host-contract tests.

## Recommended implementation approach

Use a reducer-backed `src/hooks/use-quick-app2-form.ts` hook:

1. Store raw control values and a stable initial baseline.
2. Use `QuickApp2Schema.safeParse()` for validation.
3. Map Zod issues to a project-owned error shape.
4. Expose typed field adapters and semantic actions.
5. Keep JSON text and numeric intermediate values editable before parsing.
6. Migrate sections from RHF controllers to the adapters.
7. Remove RHF-only helpers and dependencies last.

Avoid independent `useState` per field. Correlated updates—toolset transitions, starter arrays, feature cleanup, asynchronous model resolution, and dirty tracking—need one coordinated state owner.

## Next steps

The detailed OpenSpec artifacts are in `openspec/changes/remove-react-hook-form/`:

- `proposal.md` — motivation, scope, impact, alternatives, and acceptance criteria.
- `design.md` — reducer/controller design, migration strategy, risks, and test matrix.
- `tasks.md` — ordered implementation checklist with per-task verification.
- No delta spec is created because this is intended to preserve existing observable behavior; the change opts out with `skip_specs: true`.

Implementation should proceed only after reviewing the proposal and design. Start with characterization tests, then implement the controller and migrate sections in slices. Do not remove the packages until the regression matrix and final lint/typecheck/build/test checks pass.

## Status (paused)

Work is paused after task 3 of `openspec/changes/remove-react-hook-form/tasks.md`. Resume from task 4.1.

Done:

- Tasks 1.x: characterization tests.
- Tasks 2.x: `useQuickApp2Form` controller (`src/hooks/use-quick-app2-form.ts`) with tests.
- Tasks 3.1/3.2: `QuickApp2Form` root plus `InstructionsSection`, `AdvancedSettingsSection`, `AgentSkillsFormSection` and `ModelConfigurationSection` are RHF-free.

Temporary scaffolding:

- `src/components/QuickApp2FormLegacyFields/` wraps the three unmigrated sections (`ContextAndToolsSection`, `ConversationStartersSection`, `UserAttachmentsSection`) in a local RHF `useForm` and syncs it with the controller. Delete it once 4.1 and 4.2 land (task 5.1).
- `react-hook-form` and `@hookform/resolvers` stay in `package.json` until task 5.2.

State at pause: typecheck, lint and the full Vitest suite (26 files, 206 tests) pass.

Next: 4.1 `ContextAndToolsSection` (uses the controller actions `setAgentIds`, `configureAgent`, `switchToJsonView`, `switchToSimpleView`, `discardJson`), then 4.2, 4.3, 5.x, 6.x.

### Update after merging `development` (2026-10-07)

`development` changed the form in ways that make parts of the plan obsolete:

- The JSON view is gone (`isJsonView`/`agentsAndToolsetsJson` removed from the schema). The controller's `switchToJsonView`/`switchToSimpleView`/`discardJson` were removed too. Ignore the JSON items in tasks 4.1 and 1.3.
- `AddOnsSection` (agent skills + agents/toolsets) is migrated to value props and no longer uses RHF. `ContextAndToolsSection` now only has context files and toggles.
- `UserAttachmentsSection` uses a value-controlled `TagInput`, so `attachmentTypesResetKey` is no longer consumed by the UI. Remove it from the controller in 4.2.
- Remaining RHF consumers: `ContextAndToolsSection`, `ConversationStartersSection`, `UserAttachmentsSection` (via `QuickApp2FormLegacyFields`).
