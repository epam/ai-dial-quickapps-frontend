# React Hook Form Removal Plan

**Status:** Source migration complete; complete; only archiving the OpenSpec change remains (see [Current state](#current-state-2026-10-23) below).

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

`src/components/QuickApp2Form/QuickApp2Form.tsx` is the only form owner. It is now backed by the `useQuickApp2Form` controller (`src/hooks/use-quick-app2-form.ts`) and no longer imports RHF. The list below records the pre-migration RHF surface, which the controller replaces:

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

Important behavior in this file (line numbers refer to the pre-migration version):

- `:98-152` updates model lists, resolves asynchronous defaults, clears feature-disabled values, reports model readiness, and forwards dirty state.
- `:163-178` handles `DIAL_EDITOR_TRIGGER_SAVE_EVENT`, autosave dirty gating, and invalid-submit suppression.
- `:180-243` derives conditional UI state and updates agents/toolsets while preserving existing metadata.
- `:249-266` validates MIME tags and remounts the tag input after an invalid optimistic edit.
- `:279-282` handles ordinary form submission.

### RHF-controlled sections

The following components still import RHF types/components and contain active `Controller` instances. They are rendered through the temporary `src/components/QuickApp2FormLegacyFields/` wrapper:

- `src/components/ContextAndTools/ContextAndToolsSection.tsx` — document files, code interpreter, file tools, add attachment, and web fetch.
- `src/components/ConversationStarters/ConversationStartersSection.tsx` — starters, intro text, auto-submit, and chat-input-disabled state; forwards container blur.
- ~~`src/components/UserAttachments/UserAttachmentsSection.tsx`~~ — migrated and removed by `move-attachments-to-settings` (see the update at the end).

There are 11 active `Controller` instances. The sections are already mostly controlled components, so they can be migrated to typed `value`/`onChange`/`onBlur`/`error` adapters.

Already migrated to value props (no RHF imports): `AdvancedSettingsSection`, `InstructionsSection`, `AgentSkillsFormSection`, `AddOnsSection` (agent skills and agents/toolsets), and everything under `src/components/Orchestrator/` (`ModelConfigurationSection`, `DefaultModelBlock`, `ModelCatalogModal`, `SelectedModelCard`).

### RHF-only helper

- `src/components/common/Forms/ControlledFormField.tsx` imports the generic RHF controller surface and exports `withController`.
- Repository search found no call sites for `withController`; it can be deleted once the migration confirms it remains unused.

### Tests using RHF

- `src/components/ContextAndTools/tests/ContextAndToolsSection.test.tsx` imports RHF to provide `control`.
- `src/components/QuickApp2FormLegacyFields/tests/QuickApp2FormLegacyFields.test.tsx` covers the temporary wrapper and goes away with it (task 5.1).
- `InstructionsSection` and `ModelConfigurationSection` tests no longer create `useForm`.
- `src/components/QuickApp2Form/tests/QuickApp2Form.test.tsx` renders the real form owner and will need updates when its state/controller contract changes, although it does not directly import RHF today.

### RHF-independent code to preserve

`src/form/quickApp2Form.ts` should remain unchanged in responsibility:

- `QuickApp2Schema` and `AddOnSchema`.
- `getQuickApp2FormData` and default model resolution.
- `getAddOnsFormValue`.
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

Verify two-way value propagation for:

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

## Status history (paused, then superseded)

Work is paused after task 3 of `openspec/changes/remove-react-hook-form/tasks.md`. Resume from task 4.1.

Done:

- Tasks 1.x: characterization tests.
- Tasks 2.x: `useQuickApp2Form` controller (`src/hooks/use-quick-app2-form.ts`) with tests.
- Tasks 3.1/3.2: `QuickApp2Form` root plus `InstructionsSection`, `AdvancedSettingsSection`, `AgentSkillsFormSection` and `ModelConfigurationSection` are RHF-free.

Temporary scaffolding:

- `src/components/QuickApp2FormLegacyFields/` wraps the unmigrated sections (`ContextAndToolsSection`, `ConversationStartersSection`) in a local RHF `useForm` and syncs it with the controller. Delete it once 4.1 and 4.2 land (task 5.1).
- `react-hook-form` and `@hookform/resolvers` stay in `package.json` until task 5.2.

State at pause: typecheck, lint and the full Vitest suite (26 files, 206 tests) pass.

Next: 4.1 `ContextAndToolsSection` (uses the controller actions `setAgentIds`, `configureAgent`, `switchToJsonView`, `switchToSimpleView`, `discardJson`), then 4.2, 4.3, 5.x, 6.x.

### Update after merging `development` (2026-10-07)

`development` changed the form in ways that make parts of the plan obsolete:

- The JSON view is gone (`isJsonView`/`addOnsJson` removed from the schema). The controller's `switchToJsonView`/`switchToSimpleView`/`discardJson` were removed too. Ignore the JSON items in tasks 4.1 and 1.3.
- `AddOnsSection` (agent skills + agents/toolsets) is migrated to value props and no longer uses RHF. `ContextAndToolsSection` now only has context files and toggles.
- `UserAttachmentsSection` uses a value-controlled `TagInput`, so `attachmentTypesResetKey` is no longer consumed by the UI. Remove it from the controller in 4.2.
- Remaining RHF consumers: `ContextAndToolsSection`, `ConversationStartersSection`, `UserAttachmentsSection` (via `QuickApp2FormLegacyFields`).

### Update after `move-attachments-to-settings` (2026-10-07)

User attachments are off RHF. This is tracked as task 4.4 in `openspec/changes/remove-react-hook-form/tasks.md`, and was done in change `move-attachments-to-settings` (#199):

- `UserAttachmentsSection` is deleted. Attachment types now live in an Attachments row in Configuration (`src/components/Attachments/AttachmentsSection/AttachmentsSection.tsx`), driven by `useQuickApp2Form`:
  - `inputAttachmentTypes`;
  - a form-only `attachmentsEnabled` that drives the switch and is never serialized;
  - `QuickApp2Schema` makes "enabled with no types" an error that blocks save.
- `inputAttachmentTypes` is no longer in `LEGACY_FIELDS`, and the attachment error bridge in `QuickApp2FormLegacyFields` is gone.
- `setAttachmentTypes`, `attachmentTypesResetKey` and `MIME_TYPE_REGEX` are removed from the controller. MIME validation was dropped by design: the field is the ui-kit `AutocompleteTagInput`, matching the DIAL admin app, so the MIME-rollback cases above no longer apply.
- Remaining RHF consumers: `ContextAndToolsSection` and `ConversationStartersSection` (via `QuickApp2FormLegacyFields`). The starters section is being replaced by `redesign-conversation-starters`.

Next: 4.1 `ContextAndToolsSection`, then 4.2 (inside `redesign-conversation-starters`), 4.3, 5.x, 6.x.

## Current state (2026-10-23)

Verified against the tree on `development` (`8cd5279`):

- `src` and its tests contain **no** imports of `react-hook-form` or `@hookform/resolvers`.
- `src/components/QuickApp2FormLegacyFields/` and `src/components/common/Forms/ControlledFormField.tsx` are deleted (no `LegacyFields`/`ControlledFormField`/`withController` references remain).
- Remaining RHF consumers were removed by other changes, not by this one:
  - `ContextAndToolsSection`: removed by `move-feature-toggles-to-advanced-settings` (task 4.1 superseded).
  - `UserAttachmentsSection`: removed by `move-attachments-to-settings` (task 4.4).
  - `ConversationStartersSection`: replaced and moved to the controller by `redesign-conversation-starters` (archived 2026-10-08; task 4.2).
- Still present: `react-hook-form` (`package.json:47`) and `@hookform/resolvers` (`package.json:34`), plus their entries in `package-lock.json`. Nothing imports them, so they are dead dependencies.
- Stale mentions to fix: `AGENTS.md:16` (`form/` described as "react-hook-form schema definitions"), `openspec/config.yaml:24,42,74`, `docs/TECH_DEBT.md:10,124`, `docs/quickapps-migration-guide.md:408`.
- Not re-run in this update: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. The last recorded green run (26 files, 206 tests) predates the later changes.

### Remaining tasks (`openspec/changes/remove-react-hook-form/tasks.md`)

| Task | State |
| --- | --- |
| 4.2 starters migration | Done via `redesign-conversation-starters`; tick it. |
| 4.3 RHF-free test fixtures | Appears done (no RHF in tests); confirm by running the three named test files, then tick. |
| 5.1 delete helper / RHF imports | Done; tick after a repo-wide search. |
| 5.2 remove packages, regenerate lockfile | Open. |
| 5.3 docs (`TECH_DEBT.md`, `AGENTS.md`, this plan, plus `config.yaml`, migration guide) | Open. |
| 6.1 full test/lint/typecheck/build | Open. |
| 6.2 host save/dirty/autosave/reset check | Open; use the embedded browser if a chat-api host is available, otherwise record the limitation. |

### Proposed next steps

1. Run `npm test`, `npm run lint`, `npm run typecheck` on the current tree to confirm a green baseline.
2. `npm uninstall react-hook-form @hookform/resolvers` (keeps `zod`), then run `npm run build`.
3. Update the stale docs listed above and tick tasks 4.2, 4.3, 5.1 and 5.2 in `tasks.md`.
4. Do the 6.2 host-flow check, or record that it was not possible.
5. Archive the change with `openspec-archive-change` (it has `skip_specs: true`, so no spec sync is needed).

Steps 1 to 3 fit in one small PR; step 4 is a manual gate before merge.

### Update (2026-10-23, later)

`react-hook-form` and `@hookform/resolvers` are uninstalled and the lockfile regenerated; stale mentions in `AGENTS.md`, `openspec/config.yaml`, `docs/TECH_DEBT.md` and the migration guide are fixed. Tasks 4.2, 4.3, 5.1 and 5.2 are ticked. Remaining: 5.3 sign-off, 6.1 build record, 6.2 host-flow check.

### Final (2026-10-24)

Tasks 5.3, 6.1 and 6.2 are done: typecheck, lint, build and the test suite pass (977/977 without coverage), and save/dirty/autosave/reset were verified manually against a live host. Only archiving `remove-react-hook-form` remains. Known unrelated flake: two `FileManagerModal` selection tests fail under `npm test` (coverage) but pass alone.
