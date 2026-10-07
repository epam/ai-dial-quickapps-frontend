# Design

## Context

See `proposal.md` for motivation and scope. The current form owner is `src/components/QuickApp2Form.tsx:76-178,180-277`, which creates one RHF form with `zodResolver(QuickApp2Schema)` and coordinates model loading, feature flags, dirty state, host-triggered save, JSON/simple toolset views, and MIME-tag recovery. Seven section components receive RHF `Control`/`FieldErrors` and contain 17 active `Controller` instances. The schema, defaults, and serialization in `src/form/quickApp2Form.ts:48-141,193-463` are already independent of RHF.

The replacement must preserve the existing host-facing behavior consumed by `EditorClient.tsx`, including dirty notifications and the `DIAL_EDITOR_TRIGGER_SAVE_EVENT` save path. It must also preserve controlled third-party input contracts and raw editing values such as an empty attachment-count input.

## Goals / Non-Goals

**Goals:**

- Centralize form values, validation errors, dirty-baseline comparison, submit gating, and semantic updates in a project-owned form controller.
- Continue using `QuickApp2Schema` as the validation source of truth, calling Zod directly rather than through `zodResolver`.
- Make editor sections independent of RHF by giving them typed field/adaptor props.
- Preserve the current observable behavior and host/API contracts.
- Provide a rollback boundary until parity tests pass.
- Remove both RHF packages only after all imports and tests have migrated.

**Non-Goals:**

- No redesign of the editor layout or UI components.
- No changes to application serialization, API calls, authentication, host message names, or persistence behavior.
- No new user-visible strings or translation changes.
- No replacement of Zod.
- No new React context unless implementation proves the existing parent-to-section adapter contracts insufficient; the initial design keeps ownership in a custom hook used by `QuickApp2Form`.

## Decisions

### 1. Use a reducer-backed `useQuickApp2Form` hook

Create `src/hooks/use-quick-app2-form.ts` as the single state owner for the form. A reducer is preferred to independent field state because JSON/simple view transitions, toolset metadata, starter rows, feature cleanup, and async model updates can change correlated values atomically.

The hook should expose a narrow semantic API, including:

- current `values`
- mapped `errors`
- `isDirty`
- scalar/list field update operations
- semantic agents/toolsets and JSON/simple-view actions
- attachment-tag validation/recovery state
- `validate` and `submit`
- `reset` or remount-compatible initialization

The hook should retain a deep-cloned initial baseline for dirty comparison. The baseline must reflect the same initial value shape used by `getQuickApp2FormData`, including generated starter row IDs, and must not be silently replaced by ordinary user edits.

**Alternative rejected:** separate `useState` calls per field. That would scatter validation and dirty semantics and make correlated array updates error-prone.

### 2. Keep raw editing state separate from parsed submit data

The reducer stores values in the shape needed by controls. Submission calls `QuickApp2Schema.safeParse(values)`. The parsed result is passed to `onSave` only when valid.

This is required for `maxInputAttachments`, whose schema preprocesses an empty string to `undefined`, and for JSON text, which must remain editable even when temporarily invalid. Zod issues should be mapped by their path into a project-owned error representation consumed by fields and section-level JSON errors.

**Alternative rejected:** parse every keystroke into the submit type. This can prevent valid intermediate input states and alter the current editing UX.

### 3. Replace `Control`/`Controller` with typed field adapters

Each section receives only the values and callbacks it renders. Scalar fields use `value`, `onChange`, optional `onBlur`, and `error`; list and nested fields use typed update callbacks or semantic actions. The sections should not receive arbitrary reducer dispatch or recreate form validation rules.

The adapter layer must preserve normalization currently supplied by RHF/controller callbacks, including boolean toggles, number inputs, optional values, rich-text callbacks, Monaco JSON changes, file selection changes, and starter blur behavior.

The unused `src/components/common/Forms/ControlledFormField.tsx` can be removed after a repository-wide import check confirms it has no consumers.

### 4. Preserve current validation and host-event semantics explicitly

The controller must implement these rules rather than relying on generic form-library defaults:

- ordinary native submit validates and calls `onSave` only on success;
- host-triggered save skips when read-only;
- auto-save skips when dirty is false unless `ignoreDirty` is true;
- invalid submissions do not call `onSave`;
- model availability/resolution and selected attachment tags request validation where the current code does;
- feature-gated fields are cleared when their feature becomes unavailable;
- host reset reinitializes values/errors/dirty baseline using the same remount behavior currently provided by `EditorClient`.

### 5. Migrate in characterization-first slices

Before replacing production wiring, add tests for current behavior. Then introduce the custom controller and migrate one section at a time while the root form remains runnable. Keep the RHF implementation available until all behavior checks pass; the branch can be rolled back to the RHF implementation without reverting domain builders or host/API code.

The final migration removes RHF imports from the root, sections, and tests, then removes the packages and regenerates the lockfile.

## Risks / Trade-offs

- **[Dirty-state drift]** A custom deep comparison can disagree with RHF around defaults, generated IDs, array ordering, or external updates → capture current dirty transitions before migration and compare exact host `DirtyState` messages.
- **[Validation timing drift]** Calling Zod on every reducer action may differ from the current `setValue` validation flags → encode validation intent in reducer actions and test model/options updates, feature cleanup, attachment changes, blur, and submit separately.
- **[Raw-value coercion drift]** Parsing numeric or JSON fields too early can break intermediate editing → preserve raw control values and parse only for validation/submit.
- **[Controlled-input regressions]** Rich editors, file selectors, tags, and model selectors do not emit uniform native events → create adapters per control category and test value propagation in both directions.
- **[Array identity drift]** Starter IDs or `[schema]:*` tool metadata could be lost during immutable updates → use semantic array actions and assert identity/metadata in reducer tests.
- **[Autosave/reset regression]** The controller could conflate dirty state with serialized save changes or reset the wrong baseline → retain separate dirty and serialized-change concepts and exercise host event/reset tests.
- **[Render performance regression]** A single reducer may rerender every section on each change → measure before/after, memoize section props, and keep derived selectors narrow; do not assume RHF removal improves performance.
- **[Scope creep into host/API]** Save/reset behavior crosses `EditorClient` and host messaging → treat those files as regression-test targets only and do not alter protocol or API code.
- **[Rollback complexity]** Deleting dependencies too early removes the easy fallback → keep the dependency-removal commit last and make the adapter migration independently revertible.

## Migration Plan

1. Add characterization tests and establish lint, typecheck, build, and Vitest baselines.
2. Implement the reducer-backed controller and Zod error mapping without changing host/API contracts.
3. Migrate sections from RHF `Control`/`Controller` to typed adapters, prioritizing scalar fields before nested arrays and JSON/toolset transitions.
4. Run the full regression matrix, including manual host save/reset/autosave checks where browser embedding is required.
5. Remove unused RHF-only helpers and all RHF imports; remove `react-hook-form` and `@hookform/resolvers` and regenerate `package-lock.json`.
6. Run final static checks, tests, and bundle inspection. If parity fails, restore the RHF adapter/dependencies while keeping the independent domain code.

## Test and Verification Matrix

- **Schema:** valid form; invalid JSON in JSON view; non-array JSON; unavailable model; model without tool support; invalid max attachment count; empty max attachment count.
- **Dirty state:** first edit; edit then restore; nested list edit; programmatic model/options update; feature-gated cleanup; initial empty/generated starter row; host dirty notification.
- **Submission:** native submit; valid submit payload; invalid submit suppression; read-only submit; host-triggered save; auto-save when clean; auto-save when dirty; `ignoreDirty`.
- **Async state:** model list arriving after initial render; saved model resolution; fallback model resolution; model-ready callback timing.
- **Controlled inputs:** instructions editor; model selector; temperature; toggles; skills; files; tags; Monaco JSON; starter blur; value propagation and disabled/read-only behavior.
- **Arrays and semantic transitions:** starter append/remove/trailing blank row/stable IDs; agents/toolsets metadata preservation; JSON-to-simple conversion; simple-to-JSON conversion; discard JSON; document-file add/remove and deduplication.
- **Recovery:** invalid MIME tag error and input remount/resynchronization; reset clears errors and restores the initial value baseline.
- **Tooling:** `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, repository-wide search for RHF imports, and an optional production bundle comparison.
